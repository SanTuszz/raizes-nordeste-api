// Arquivo pra popular o banco com dados iniciais pra facilitar os testes
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed do banco Raizes do Nordeste...');

  // Cria senhas criptografadas (hash) pra atender a LGPD e seguranca
  const senhaPadrao = await bcrypt.hash('123456', 10);

  // 1. Usuarios de teste (um gerente e um cliente)
  const gerente = await prisma.usuario.upsert({
    where: { email: 'gerente@raizes.com' },
    update: {},
    create: {
      nome: 'Carlos Gerente',
      email: 'gerente@raizes.com',
      senhaHash: senhaPadrao,
      perfil: 'GERENTE',
      consentimentoLgpd: true
    }
  });

  const cliente = await prisma.usuario.upsert({
    where: { email: 'cliente@raizes.com' },
    update: {},
    create: {
      nome: 'Douglas Cliente',
      email: 'cliente@raizes.com',
      senhaHash: senhaPadrao,
      perfil: 'CLIENTE',
      consentimentoLgpd: true,
      pontosFidelidade: 50
    }
  });

  // 2. Unidades da rede
  const unidadeMatriz = await prisma.unidade.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Raizes do Nordeste - Matriz Recife',
      cidade: 'Recife',
      endereco: 'Av. Boa Viagem, 1500'
    }
  });

  const unidadeFilial = await prisma.unidade.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nome: 'Raizes do Nordeste - Filial Fortaleza',
      cidade: 'Fortaleza',
      endereco: 'Av. Beira Mar, 800'
    }
  });

  // 3. Produtos do cardapio nordestino
  const p1 = await prisma.produto.upsert({
    where: { id: 1 },
    update: {},
    create: {
      nome: 'Tapioca de Carne de Sol com Queijo Coalho',
      descricao: 'Tapioca crocante recheada com carne de sol desfiada na nata',
      preco: 22.50,
      categoria: 'Tapiocas'
    }
  });

  const p2 = await prisma.produto.upsert({
    where: { id: 2 },
    update: {},
    create: {
      nome: 'Cuscuz Nordestino Completo',
      descricao: 'Cuscuz de milho amarelo com ovo, bacon, charque e queijo',
      preco: 19.90,
      categoria: 'Pratos Tipicos'
    }
  });

  const p3 = await prisma.produto.upsert({
    where: { id: 3 },
    update: {},
    create: {
      nome: 'Suco de Caju Natural 500ml',
      descricao: 'Suco gelado feito da fruta',
      preco: 9.00,
      categoria: 'Bebidas'
    }
  });

  // 4. Estoque inicial por unidade (p3 fica zerado na Matriz pra testar erro 409)
  await prisma.estoque.upsert({
    where: { unidadeId_produtoId: { unidadeId: unidadeMatriz.id, produtoId: p1.id } },
    update: { quantidade: 20 },
    create: { unidadeId: unidadeMatriz.id, produtoId: p1.id, quantidade: 20 }
  });

  await prisma.estoque.upsert({
    where: { unidadeId_produtoId: { unidadeId: unidadeMatriz.id, produtoId: p2.id } },
    update: { quantidade: 15 },
    create: { unidadeId: unidadeMatriz.id, produtoId: p2.id, quantidade: 15 }
  });

  await prisma.estoque.upsert({
    where: { unidadeId_produtoId: { unidadeId: unidadeMatriz.id, produtoId: p3.id } },
    update: { quantidade: 0 },
    create: { unidadeId: unidadeMatriz.id, produtoId: p3.id, quantidade: 0 }
  });

  await prisma.estoque.upsert({
    where: { unidadeId_produtoId: { unidadeId: unidadeFilial.id, produtoId: p1.id } },
    update: { quantidade: 10 },
    create: { unidadeId: unidadeFilial.id, produtoId: p1.id, quantidade: 10 }
  });

  console.log('Seed finalizado com sucesso!');
  console.log({ gerente: gerente.email, cliente: cliente.email });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
