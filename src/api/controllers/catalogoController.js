// Controller auxiliar para consultar unidades, produtos, estoque e logs de auditoria
const prisma = require('../../infrastructure/database/prismaClient');

class CatalogoController {
  async listarUnidades(req, res, next) {
    try {
      const unidades = await prisma.unidade.findMany({ where: { ativa: true } });
      return res.status(200).json(unidades);
    } catch (err) {
      next(err);
    }
  }

  async listarProdutos(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);

      const [dados, total] = await Promise.all([
        prisma.produto.findMany({
          where: { ativo: true },
          skip,
          take: Number(limit)
        }),
        prisma.produto.count({ where: { ativo: true } })
      ]);

      return res.status(200).json({ page: Number(page), limit: Number(limit), total, dados });
    } catch (err) {
      next(err);
    }
  }

  async consultarEstoqueUnidade(req, res, next) {
    try {
      const { unidadeId } = req.params;
      const estoque = await prisma.estoque.findMany({
        where: { unidadeId: Number(unidadeId) },
        include: { produto: { select: { id: true, nome: true, preco: true, categoria: true } } }
      });
      return res.status(200).json(estoque);
    } catch (err) {
      next(err);
    }
  }

  async listarLogsAuditoria(req, res, next) {
    try {
      const logs = await prisma.logAuditoria.findMany({
        orderBy: { criadoEm: 'desc' },
        take: 30
      });
      return res.status(200).json(logs);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new CatalogoController();
