const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../infrastructure/database/prismaClient');
const { registrarLog } = require('../../infrastructure/database/auditoriaService');

class AuthController {
  // Cadastro de usuario com hash de senha e registro de consentimento LGPD
  async registrar(req, res, next) {
    try {
      const { nome, email, senha, perfil, consentimentoLgpd } = req.body;

      if (!nome || !email || !senha) {
        const erro = new Error('Nome, e-mail e senha sao obrigatorios.');
        erro.statusCode = 422;
        erro.code = 'DADOS_OBRIGATORIOS_AUSENTES';
        throw erro;
      }

      if (!email.includes('@')) {
        const erro = new Error('Formato de e-mail invalido.');
        erro.statusCode = 422;
        erro.code = 'EMAIL_INVALIDO';
        erro.details = [{ field: 'email', issue: 'Deve ser um e-mail valido' }];
        throw erro;
      }

      const existente = await prisma.usuario.findUnique({ where: { email } });
      if (existente) {
        const erro = new Error('Ja existe um usuario cadastrado com este e-mail.');
        erro.statusCode = 409;
        erro.code = 'EMAIL_JA_CADASTRADO';
        throw erro;
      }

      const senhaHash = await bcrypt.hash(senha, 10);

      const novoUsuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senhaHash,
          perfil: perfil ? perfil.toUpperCase() : 'CLIENTE',
          consentimentoLgpd: Boolean(consentimentoLgpd)
        }
      });

      await registrarLog(novoUsuario.id, 'USUARIO_CADASTRADO', `Usuario ${email} cadastrado.`);

      // Nunca retorna o senhaHash na resposta (boas praticas LGPD/Seguranca)
      return res.status(201).json({
        id: novoUsuario.id,
        nome: novoUsuario.nome,
        email: novoUsuario.email,
        perfil: novoUsuario.perfil,
        consentimentoLgpd: novoUsuario.consentimentoLgpd
      });
    } catch (err) {
      next(err);
    }
  }

  // Login e geracao de token JWT
  async login(req, res, next) {
    try {
      const { email, senha } = req.body;

      if (!email || !senha) {
        const erro = new Error('Informe e-mail e senha.');
        erro.statusCode = 422;
        erro.code = 'CAMPOS_OBRIGATORIOS';
        throw erro;
      }

      const usuario = await prisma.usuario.findUnique({ where: { email } });
      if (!usuario) {
        const erro = new Error('E-mail ou senha invalidos.');
        erro.statusCode = 401;
        erro.code = 'CREDENCIAIS_INVALIDAS';
        throw erro;
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
      if (!senhaValida) {
        const erro = new Error('E-mail ou senha invalidos.');
        erro.statusCode = 401;
        erro.code = 'CREDENCIAIS_INVALIDAS';
        throw erro;
      }

      const accessToken = jwt.sign(
        { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
        process.env.JWT_SECRET,
        { expiresIn: '2h' }
      );

      await registrarLog(usuario.id, 'LOGIN_REALIZADO', `Login efetuado por ${usuario.email}`);

      return res.status(200).json({
        accessToken,
        tokenType: 'Bearer',
        expiresIn: 7200,
        user: {
          id: usuario.id,
          nome: usuario.nome,
          perfil: usuario.perfil
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
