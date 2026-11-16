# API Back-End — Rede "Raízes do Nordeste"

Projeto desenvolvido para a disciplina **Projeto Multidisciplinar — Trilha Back-End (UNINTER)**.
Autor: **Douglas Robert dos Santos** (RU: `4819839`).

---

## 1. Tecnologias Utilizadas
- **Node.js** (v18+) e **Express**
- **Prisma ORM** com banco de dados **SQLite** (não exige instalação de servidor externo para rodar os testes)
- **JWT (JSON Web Token)** e **bcryptjs** para autenticação e segurança
- **Swagger UI (OpenAPI 3.0)** para documentação interativa

---

## 2. Estrutura do Projeto (Arquitetura em Camadas)
```text
├── prisma/
│   ├── schema.prisma      # Modelagem das tabelas e relacionamentos
│   └── seed.js            # Script de carga inicial (usuários, unidades, produtos e estoque)
├── postman/
│   └── Raizes_Nordeste_Collection.json  # Coleção completa de testes (16 cenários)
├── src/
│   ├── domain/            # Regras puras do domínio (PedidoDomain, validações de canal/status)
│   ├── application/       # Casos de uso e orquestração (PedidoService)
│   ├── infrastructure/    # Acesso a banco (Prisma) e serviço de logs de auditoria
│   ├── api/               # Controllers, Middlewares (JWT/RBAC/Erros) e Rotas
│   ├── swagger.json       # Especificação OpenAPI
│   └── server.js          # Ponto de entrada da aplicação
├── .env.example           # Modelo de variáveis de ambiente
└── package.json
```

---

## 3. Como Configurar e Executar Localmente

### Passo 1: Instalar dependências
```bash
npm install
```

### Passo 2: Configurar variáveis de ambiente
Copie o arquivo `.env.example` para `.env`:
```bash
cp .env.example .env
```
*(No Windows PowerShell, use: `copy .env.example .env`)*

### Passo 3: Criar o banco de dados e rodar migrations
```bash
npm run prisma:migrate
```

### Passo 4: Popular o banco com dados iniciais (Seed)
```bash
npm run prisma:seed
```
Isso criará automaticamente:
- **Gerente:** `gerente@raizes.com` | Senha: `123456`
- **Cliente:** `cliente@raizes.com` | Senha: `123456`
- **Unidades:** Matriz Recife (ID `1`) e Filial Fortaleza (ID `2`)
- **Produtos e Estoque:** Tapioca (ID `1`), Cuscuz (ID `2`) e Suco de Caju (ID `3`, com estoque `0` na Matriz para teste de erro `409`).

### Passo 5: Iniciar a API
```bash
npm start
```
A API iniciará em: `http://localhost:3000`

---

## 4. Documentação Swagger e Testes
- **Swagger UI:** Acesse `http://localhost:3000/api-docs` no navegador após iniciar o servidor.
- **Coleção Postman/Insomnia:** Importe o arquivo `postman/Raizes_Nordeste_Collection.json`.
  1. Execute primeiro as requisições **T01 (Login Cliente)** e **T02 (Login Gerente)** para salvar os tokens automaticamente nas variáveis da coleção.
  2. Em seguida, execute os demais testes na ordem das pastas.
