const pedidoService = require('../../application/services/pedidoService');

class PedidoController {
  async criar(req, res, next) {
    try {
      const { unidadeId, canalPedido, itens, formaPagamento, clienteId } = req.body;
      // Se o clienteId nao vier no body, pega o id do proprio usuario logado no token
      const idClienteFinal = clienteId || req.usuario.id;

      const pedido = await pedidoService.criarPedido(
        {
          clienteId: idClienteFinal,
          unidadeId,
          canalPedido,
          formaPagamento,
          itens
        },
        req.usuario.id
      );

      return res.status(201).json(pedido);
    } catch (err) {
      next(err);
    }
  }

  async listar(req, res, next) {
    try {
      const { canalPedido, status, page, limit } = req.query;
      const resultado = await pedidoService.listarPedidos({ canalPedido, status, page, limit });
      return res.status(200).json(resultado);
    } catch (err) {
      next(err);
    }
  }

  async atualizarStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const pedido = await pedidoService.atualizarStatus(id, status, req.usuario.id);
      return res.status(200).json(pedido);
    } catch (err) {
      next(err);
    }
  }

  async pagarMock(req, res, next) {
    try {
      const { pedidoId, simularRecusa } = req.body;
      const resultado = await pedidoService.processarPagamentoMock(
        { pedidoId, simularRecusa },
        req.usuario.id
      );
      return res.status(200).json(resultado);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PedidoController();
