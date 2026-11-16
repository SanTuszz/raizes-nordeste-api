// Arquivo principal de inicializacao do servidor Express
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const routes = require('./api/routes');
const errorHandler = require('./api/middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Rota da documentacao interativa Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Rotas principais da API
app.use('/api', routes);

// Rota raiz simples pra checar se a API esta online
app.get('/', (req, res) => {
  res.json({
    projeto: 'API Rede Raizes do Nordeste',
    status: 'Online',
    documentacao: `http://localhost:${PORT}/api-docs`
  });
});

// Middleware global de tratamento e padronizacao de erros
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Swagger disponivel em http://localhost:${PORT}/api-docs`);
});
