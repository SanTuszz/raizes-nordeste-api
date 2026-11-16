// Camada Infrastructure: conexao unica com o banco via Prisma
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

module.exports = prisma;
