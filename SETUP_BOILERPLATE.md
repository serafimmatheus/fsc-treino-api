# Guia: Iniciar Projeto Node.js com Fastify

Este documento descreve passo a passo como este projeto (`fsc-treino-api`) foi configurado. Use-o como boilerplate para iniciar novos projetos Node com Fastify da mesma forma.

---

## Índice

1. [Inicialização do Projeto](#1-inicialização-do-projeto)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Configurações](#3-configurações)
4. [Bibliotecas e Setup](#4-bibliotecas-e-setup)
5. [Banco de Dados e Prisma](#5-banco-de-dados-e-prisma)
6. [Autenticação (Better Auth)](#6-autenticação-better-auth)
7. [API Fastify](#7-api-fastify)
8. [Variáveis de Ambiente](#8-variáveis-de-ambiente)
9. [Docker](#9-docker)
10. [Editor (VS Code)](#10-editor-vs-code)

---

## 1. Inicialização do Projeto

```bash
mkdir meu-projeto-api && cd meu-projeto-api
pnpm init
```

### Package.json essencial

```json
{
  "name": "meu-projeto-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev:server": "tsx --watch src/index.ts"
  },
  "engines": {
    "node": "24.x"
  },
  "packageManager": "pnpm@10.18.3"
}
```

- **`"type": "module"`**: Projeto ESM (import/export).
- **`tsx`**: Executa TypeScript em dev sem build prévio, com hot reload.
- **`engines`**: Define versão do Node.

---

## 2. Estrutura de Pastas

```
fsc-treino-api/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── index.ts              # Entrada da aplicação
│   ├── lib/                  # Utilitários e libs
│   │   └── auth.ts
│   └── generated/            # Código gerado (ex: Prisma client)
│       └── prisma/
├── .vscode/
│   └── settings.json
├── .cursor/
│   └── rules/
├── docker-compose.yml
├── prisma.config.ts
├── tsconfig.json
├── eslint.config.js
├── package.json
└── .env
```

---

## 3. Configurações

### 3.1 TypeScript (`tsconfig.json`)

```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "compilerOptions": {
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "ES2024",
    "skipLibCheck": true,
    "strict": true,
    "outDir": "./dist"
  },
  "include": ["src"]
}
```

- **NodeNext**: Módulos ESM nativos do Node.
- **ES2024**: Target atual.
- **strict**: Modo estrito habilitado.

### 3.2 ESLint (Flat Config - `eslint.config.js`)

```javascript
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
  },
  tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
]);
```

- **@eslint/js** + **typescript-eslint**: Base e regras para TS.
- **eslint-config-prettier**: Evita conflitos com Prettier.
- **simple-import-sort**: Ordena imports/exports automaticamente.

### 3.3 Prettier

Instalar Prettier. Não há arquivo de config; usa defaults ou `.prettierrc` se necessário.

---

## 4. Bibliotecas e Setup

### 4.1 Dependências de produção

```bash
pnpm add fastify @fastify/cors @fastify/swagger @scalar/fastify-api-reference fastify-type-provider-zod zod dotenv @prisma/client @prisma/adapter-pg better-auth tsx
```

| Pacote                                  | Uso                      |
| --------------------------------------- | ------------------------ |
| `fastify`                               | Servidor HTTP            |
| `@fastify/cors`                         | CORS                     |
| `@fastify/swagger`                      | OpenAPI / Swagger        |
| `@scalar/fastify-api-reference`         | Documentação em `/api`   |
| `fastify-type-provider-zod`             | Validação com Zod        |
| `zod`                                   | Schemas                  |
| `dotenv`                                | Carregar `.env`          |
| `@prisma/client` + `@prisma/adapter-pg` | ORM + adapter PostgreSQL |
| `better-auth`                           | Autenticação             |
| `tsx`                                   | Execução TS em dev       |

### 4.2 Dependências de desenvolvimento

```bash
pnpm add -D typescript @types/node prisma eslint @eslint/js typescript-eslint eslint-config-prettier eslint-plugin-simple-import-sort globals prettier
```

---

## 5. Banco de Dados e Prisma

### 5.1 Prisma 7 com configuração externa

O Prisma 7 usa `prisma.config.ts` para schema e URL do banco.

**`prisma.config.ts`**:

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
```

**`prisma/schema.prisma`** – Generator com output customizado:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}
```

- A `url` não fica no schema; vem do `prisma.config.ts`.
- O client é gerado em `src/generated/prisma`.

### 5.2 Gerar cliente e migrations

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

---

## 6. Autenticação (Better Auth)

### 6.1 Lib `src/lib/auth.ts`

```typescript
import { PrismaPg } from "@prisma/adapter-pg";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { PrismaClient } from "../generated/prisma/client.js";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

export const auth = betterAuth({
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [openAPI()],
});
```

- **PrismaPg**: Adapter para PostgreSQL.
- **prismaAdapter**: Integra Better Auth com Prisma.
- **openAPI()**: Gera schema OpenAPI para documentação.

### 6.2 Modelos Better Auth no schema Prisma

Incluir no `schema.prisma` os modelos: `Account`, `Session`, `VerificationToken`, `Verification` (conforme docs do Better Auth).

---

## 7. API Fastify

### 7.1 Entrada `src/index.ts`

1. Carregar env: `import "dotenv/config"`.
2. Usar `fastify-type-provider-zod`:

   ```typescript
   app.setValidatorCompiler(validatorCompiler);
   app.setSerializerCompiler(serializerCompiler);
   ```

3. Registrar plugins:
   - `@fastify/swagger` – metadados OpenAPI, `jsonSchemaTransform`.
   - `@fastify/cors` – origens permitidas, `credentials: true`.
   - `@scalar/fastify-api-reference` – docs em `/api` (Swagger + Auth).

4. Rotas de exemplo:
   - `GET /swagger.json` – schema OpenAPI.
   - `GET /` – hello world com schema Zod.
   - `GET|POST /api/auth/*` – proxy para `auth.handler` do Better Auth.

5. Listen: `app.listen({ port: Number(process.env.PORT) || 3000 })`.

### 7.2 Imports de módulos locais

Com `moduleResolution: "nodenext"`, use extensão `.js` em imports:

```typescript
import { auth } from "./lib/auth.js";
```

---

## 8. Variáveis de Ambiente

### `.env` (exemplo)

```env
PORT=3000

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/fsc_treino"

# Better Auth
BETTER_AUTH_SECRET=<gerar-secret-forte>
BETTER_AUTH_URL=http://localhost:3000
```

### `.env.example` (versionar)

```env
PORT=3000
DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:3000
```

### `.gitignore`

```
node_modules
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
/src/generated/prisma
```

---

## 9. Docker

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17-alpine
    container_name: meu-projeto-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: meu_projeto
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

Subir banco:

```bash
docker compose up -d
```

---

## 10. Editor (VS Code)

### `.vscode/settings.json`

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always"
  }
}
```

- Formatar com Prettier ao salvar.
- Corrigir ESLint ao salvar.

---

## Checklist de Novo Projeto

- [ ] `pnpm init` + `type: module`
- [ ] Instalar dependências (prod + dev)
- [ ] Configurar `tsconfig.json`
- [ ] Configurar ESLint (flat config)
- [ ] Configurar Prettier
- [ ] Prisma: schema, `prisma.config.ts`, `prisma generate`
- [ ] Docker Compose para PostgreSQL
- [ ] `.env` e `.env.example`
- [ ] `src/index.ts` com Fastify + Swagger + CORS + Scalar
- [ ] `src/lib/auth.ts` (Better Auth + Prisma)
- [ ] Rotas `/api/auth/*` para Better Auth
- [ ] `.vscode/settings.json`
- [ ] `.cursor/rules/` (opcional)
- [ ] `.gitignore` atualizado

---

## Comandos Úteis

```bash
# Dev
pnpm run dev:server

# Banco
docker compose up -d
pnpm prisma generate
pnpm prisma migrate dev

# Prisma Studio (opcional)
pnpm prisma studio
```
