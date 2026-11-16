// Padroniza todas as respostas de erro da API conforme exigido no roteiro
function errorHandler(err, req, res, next) {
  const status = err.statusCode || 500;
  const error = err.code || (status === 500 ? 'ERRO_INTERNO_SERVIDOR' : 'ERRO_REQUISICAO');
  const message = err.message || 'Ocorreu um erro inesperado no servidor.';
  const details = err.details || [];

  return res.status(status).json({
    error,
    message,
    details,
    timestamp: new Date().toISOString(),
    path: req.originalUrl
  });
}

module.exports = errorHandler;
