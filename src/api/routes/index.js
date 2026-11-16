const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const pedidoController = require('../controllers/pedidoController');
const catalogoController = require('../controllers/catalogoController');
const { autenticarToken, autorizarPerfis } = require('../middlewares/authMiddleware');

// Rotas publicas de autenticacao e cadastro
router.post('/auth/registrar', (req, res, next) => authController.registrar(req, res, next));
router.post('/auth/login', (req, res, next) => authController.login(req, res, next));

// Rotas publicas de consulta de unidades e cardapio
router.get('/unidades', (req, res, next) => catalogoController.listarUnidades(req, res, next));
router.get('/produtos', (req, res, next) => catalogoController.listarProdutos(req, res, next));
router.get('/estoque/:unidadeId', (req, res, next) => catalogoController.consultarEstoqueUnidade(req, res, next));

// Rotas protegidas de Pedidos e Pagamento Mock
router.post('/pedidos', autenticarToken, (req, res, next) => pedidoController.criar(req, res, next));
router.get('/pedidos', autenticarToken, (req, res, next) => pedidoController.listar(req, res, next));

// Apenas GERENTE, ATENDENTE ou COZINHA podem alterar o status operacional do pedido
router.patch(
  '/pedidos/:id/status',
  autenticarToken,
  autorizarPerfis('GERENTE', 'ATENDENTE', 'COZINHA'),
  (req, res, next) => pedidoController.atualizarStatus(req, res, next)
);

// Pagamento simulado (Mock)
router.post('/pagamentos/mock', autenticarToken, (req, res, next) => pedidoController.pagarMock(req, res, next));

// Logs de auditoria (restrito ao GERENTE)
router.get(
  '/auditoria/logs',
  autenticarToken,
  autorizarPerfis('GERENTE'),
  (req, res, next) => catalogoController.listarLogsAuditoria(req, res, next)
);

module.exports = router;
