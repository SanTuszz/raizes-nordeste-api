// Camada Infrastructure: grava logs de auditoria para rastreabilidade (LGPD e seguranca)
const prisma = require('./prismaClient');

async function registrarLog(usuarioId, acao, detalhes) {
  try {
    await prisma.logAuditoria.create({
      data: {
        usuarioId: usuarioId || null,
        acao,
        detalhes
      }
    });
  } catch (err) {
    // Nao trava a aplicacao se o log falhar, mas avisa no console
    console.error('Erro ao gravar log de auditoria:', err.message);
  }
}

module.exports = { registrarLog };
