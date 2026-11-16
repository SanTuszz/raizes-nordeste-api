// Middleware de autenticacao JWT e controle de acesso por perfil (RBAC)
const jwt = require('jsonwebtoken');

function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: Bearer <token>

  if (!token) {
    return res.status(401).json({
      error: 'NAO_AUTENTICADO',
      message: 'Token de autenticacao nao fornecido.',
      details: [],
      timestamp: new Date().toISOString(),
      path: req.originalUrl
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) {
      return res.status(401).json({
        error: 'TOKEN_INVALIDO',
        message: 'Token expirado ou invalido.',
        details: [],
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }
    req.usuario = usuario;
    next();
  });
}

// Verifica se o usuario tem um dos perfis permitidos na rota
function autorizarPerfis(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return res.status(403).json({
        error: 'ACESSO_NEGADO',
        message: 'Seu perfil nao possui permissao para executar esta acao.',
        details: [{ field: 'perfil', issue: `Requer: ${perfisPermitidos.join(' ou ')}` }],
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    }
    next();
  };
}

module.exports = { autenticarToken, autorizarPerfis };
