// Camada Application: orquestra o fluxo critico (criar pedido, checar estoque, pagar mock, atualizar status)
const prisma = require('../../infrastructure/database/prismaClient');
const { PedidoDomain, CANAIS_PERMITIDOS } = require('../../domain/entities/PedidoDomain');
const { registrarLog } = require('../../infrastructure/database/auditoriaService');

class PedidoService {
  // Fluxo 1: Criar pedido validando canal, unidade, produtos e estoque
  async criarPedido({ clienteId, unidadeId, canalPedido, formaPagamento, itens }, usuarioLogadoId) {
    // 1. Valida multicanalidade obrigatoria
    if (!PedidoDomain.validarCanal(canalPedido)) {
      const erro = new Error(`canalPedido invalido ou ausente. Use: ${CANAIS_PERMITIDOS.join(', ')}`);
      erro.statusCode = 422;
      erro.code = 'CANAL_PEDIDO_INVALIDO';
      erro.details = [{ field: 'canalPedido', issue: 'Valor obrigatorio e deve ser um canal valido' }];
      throw erro;
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      const erro = new Error('O pedido precisa ter pelo menos 1 item.');
      erro.statusCode = 422;
      erro.code = 'ITENS_OBRIGATORIOS';
      erro.details = [{ field: 'itens', issue: 'Lista de itens nao pode ser vazia' }];
      throw erro;
    }

    // 2. Verifica se a unidade existe
    const unidade = await prisma.unidade.findUnique({ where: { id: Number(unidadeId) } });
    if (!unidade) {
      const erro = new Error('Unidade da rede nao encontrada.');
      erro.statusCode = 404;
      erro.code = 'UNIDADE_NAO_ENCONTRADA';
      throw erro;
    }

    // 3. Busca produtos e verifica estoque daquela unidade especifica
    const itensPreparados = [];
    for (let i = 0; i < itens.length; i++) {
      const item = itens[i];
      if (!item.quantidade || item.quantidade <= 0) {
        const erro = new Error('Quantidade do item deve ser maior que zero.');
        erro.statusCode = 422;
        erro.code = 'QUANTIDADE_INVALIDA';
        erro.details = [{ field: `itens[${i}].quantidade`, issue: 'Deve ser maior que 0' }];
        throw erro;
      }

      const produto = await prisma.produto.findUnique({ where: { id: Number(item.produtoId) } });
      if (!produto || !produto.ativo) {
        const erro = new Error(`Produto ID ${item.produtoId} nao encontrado.`);
        erro.statusCode = 404;
        erro.code = 'PRODUTO_NAO_ENCONTRADO';
        throw erro;
      }

      const estoque = await prisma.estoque.findUnique({
        where: {
          unidadeId_produtoId: {
            unidadeId: Number(unidadeId),
            produtoId: Number(item.produtoId)
          }
        }
      });

      const disponivel = estoque ? estoque.quantidade : 0;
      if (disponivel < item.quantidade) {
        const erro = new Error('Nao ha quantidade suficiente em estoque para um ou mais itens.');
        erro.statusCode = 409;
        erro.code = 'ESTOQUE_INSUFICIENTE';
        erro.details = [{ field: `itens[${i}].quantidade`, issue: `Disponivel: ${disponivel}` }];
        throw erro;
      }

      itensPreparados.push({
        produtoId: produto.id,
        quantidade: Number(item.quantidade),
        precoUnitario: produto.preco,
        estoqueId: estoque.id
      });
    }

    // 4. Calcula valor total pela regra do dominio
    const valorTotal = PedidoDomain.calcularTotal(itensPreparados);

    // 5. Salva pedido, itens e da baixa no estoque dentro de uma transacao
    const pedidoCriado = await prisma.$transaction(async (tx) => {
      const novoPedido = await tx.pedido.create({
        data: {
          clienteId: Number(clienteId),
          unidadeId: Number(unidadeId),
          canalPedido: canalPedido.toUpperCase(),
          status: 'AGUARDANDO_PAGAMENTO',
          valorTotal,
          formaPagamento: formaPagamento || 'MOCK',
          itens: {
            create: itensPreparados.map((ip) => ({
              produtoId: ip.produtoId,
              quantidade: ip.quantidade,
              precoUnitario: ip.precoUnitario
            }))
          }
        },
        include: {
          itens: true
        }
      });

      // Baixa no estoque da unidade
      for (const ip of itensPreparados) {
        await tx.estoque.update({
          where: { id: ip.estoqueId },
          data: { quantidade: { decrement: ip.quantidade } }
        });
      }

      return novoPedido;
    });

    // Registra log de auditoria
    await registrarLog(
      usuarioLogadoId,
      'PEDIDO_CRIADO',
      `Pedido #${pedidoCriado.id} criado no canal ${pedidoCriado.canalPedido} - Total R$ ${valorTotal}`
    );

    return pedidoCriado;
  }

  // Fluxo 2: Processar pagamento simulado (MOCK) e atualizar status do pedido
  async processarPagamentoMock({ pedidoId, simularRecusa }, usuarioLogadoId) {
    const pedido = await prisma.pedido.findUnique({
      where: { id: Number(pedidoId) },
      include: { pagamento: true, cliente: true }
    });

    if (!pedido) {
      const erro = new Error('Pedido nao encontrado.');
      erro.statusCode = 404;
      erro.code = 'PEDIDO_NAO_ENCONTRADO';
      throw erro;
    }

    if (pedido.pagamento && pedido.pagamento.status === 'APROVADO') {
      const erro = new Error('Este pedido ja foi pago.');
      erro.statusCode = 409;
      erro.code = 'PEDIDO_JA_PAGO';
      throw erro;
    }

    // Simula resposta de um gateway externo
    const aprovado = !simularRecusa;
    const statusPagamento = aprovado ? 'APROVADO' : 'RECUSADO';
    const novoStatusPedido = aprovado ? 'EM_PREPARO' : 'AGUARDANDO_PAGAMENTO';
    const codigoExterno = `MOCK-TX-${Date.now()}`;
    const mensagemRetorno = aprovado
      ? 'Pagamento aprovado pelo gateway simulado.'
      : 'Pagamento recusado pela operadora (simulacao).';

    const resultado = await prisma.$transaction(async (tx) => {
      const pag = await tx.pagamento.upsert({
        where: { pedidoId: pedido.id },
        update: {
          status: statusPagamento,
          codigoExterno,
          mensagemRetorno
        },
        create: {
          pedidoId: pedido.id,
          valor: pedido.valorTotal,
          status: statusPagamento,
          codigoExterno,
          mensagemRetorno
        }
      });

      const pedAtualizado = await tx.pedido.update({
        where: { id: pedido.id },
        data: { status: novoStatusPedido }
      });

      // Se aprovado e cliente deu consentimento LGPD, credita pontos de fidelidade
      if (aprovado && pedido.cliente && pedido.cliente.consentimentoLgpd) {
        const pontos = PedidoDomain.calcularPontosGanhos(pedido.valorTotal);
        if (pontos > 0) {
          await tx.usuario.update({
            where: { id: pedido.clienteId },
            data: { pontosFidelidade: { increment: pontos } }
          });
        }
      }

      return { pagamento: pag, pedido: pedAtualizado };
    });

    await registrarLog(
      usuarioLogadoId,
      `PAGAMENTO_${statusPagamento}`,
      `Pagamento ${statusPagamento} para Pedido #${pedido.id} (${codigoExterno})`
    );

    return resultado;
  }

  // Fluxo 3: Atualizar status operacional (EM_PREPARO -> PRONTO -> ENTREGUE / CANCELADO)
  async atualizarStatus(pedidoId, novoStatus, usuarioLogadoId) {
    if (!PedidoDomain.validarStatus(novoStatus)) {
      const erro = new Error('Status invalido informado.');
      erro.statusCode = 422;
      erro.code = 'STATUS_INVALIDO';
      throw erro;
    }

    const pedido = await prisma.pedido.findUnique({ where: { id: Number(pedidoId) } });
    if (!pedido) {
      const erro = new Error('Pedido nao encontrado.');
      erro.statusCode = 404;
      erro.code = 'PEDIDO_NAO_ENCONTRADO';
      throw erro;
    }

    const atualizado = await prisma.pedido.update({
      where: { id: Number(pedidoId) },
      data: { status: novoStatus.toUpperCase() }
    });

    await registrarLog(
      usuarioLogadoId,
      'STATUS_PEDIDO_ALTERADO',
      `Pedido #${pedido.id} mudou de ${pedido.status} para ${atualizado.status}`
    );

    return atualizado;
  }

  // Listar pedidos com filtro opcional por canalPedido e status + paginacao
  async listarPedidos({ canalPedido, status, page = 1, limit = 10 }) {
    const where = {};

    if (canalPedido) {
      if (!PedidoDomain.validarCanal(canalPedido)) {
        const erro = new Error(`Filtro canalPedido invalido. Use: ${CANAIS_PERMITIDOS.join(', ')}`);
        erro.statusCode = 400;
        erro.code = 'FILTRO_CANAL_INVALIDO';
        throw erro;
      }
      where.canalPedido = canalPedido.toUpperCase();
    }

    if (status) {
      where.status = status.toUpperCase();
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [dados, total] = await Promise.all([
      prisma.pedido.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { criadoEm: 'desc' },
        include: {
          itens: { include: { produto: { select: { nome: true } } } },
          pagamento: true
        }
      }),
      prisma.pedido.count({ where })
    ]);

    return {
      page: Number(page),
      limit: Number(limit),
      total,
      dados
    };
  }
}

module.exports = new PedidoService();
