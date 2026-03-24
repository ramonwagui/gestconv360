# Gestconv360 - Modulo Instrumentos/Propostas

Reestruturado para Node.js + TypeScript + Express + Prisma + SQLite.

## O que esta pronto

- CRUD de Instrumentos/Propostas
- Autenticacao JWT
- Perfis de acesso (ADMIN, GESTOR, CONSULTA)
- Validacoes principais de negocio
- Exclusao logica (campo `ativo`)
- Filtros por status, concedente e vigencia
- Endpoint de alertas de prazo (vigencia e prestacao de contas)
- Cadastro de convenetes (prefeituras)

## Stack

- API: Express com TypeScript
- ORM: Prisma
- Banco: SQLite (facil para inicio)
- Validacao: Zod

## Campos modelados

- `proposta`
- `instrumento`
- `objeto`
- `valor_repasse`
- `valor_contrapartida`
- `data_cadastro`
- `data_assinatura`
- `vigencia_inicio`
- `vigencia_fim`
- `data_prestacao_contas`
- `data_dou`
- `concedente`
- `status`
- `responsavel`
- `orgao_executor`
- `observacoes`

## Regras implementadas

- `proposta` unica
- `instrumento` unico
- `valor_repasse` e `valor_contrapartida` >= 0
- `vigencia_fim` >= `vigencia_inicio`
- `data_assinatura` nao pode ser futura

## Como executar

```bash
copy .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

## Frontend (web)

Foi adicionado um frontend React + Vite em `web/` para login/cadastro e consulta de instrumentos.

```bash
npm --prefix web install
npm run web:dev
```

- URL frontend: `http://localhost:5173`
- O Vite faz proxy para a API em `http://localhost:3000`

## URL principal

- API: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`

## Endpoints de autenticacao

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

### Exemplo de register

```json
{
  "nome": "Administrador",
  "email": "admin@gestconv360.local",
  "senha": "123456",
  "role": "ADMIN"
}
```

### Exemplo de login

```json
{
  "email": "admin@gestconv360.local",
  "senha": "123456"
}
```

Use o token retornado no header `Authorization: Bearer <token>`.

## Permissoes

- `ADMIN`: CRUD completo de instrumentos e gestao geral
- `GESTOR`: cria, lista, consulta e atualiza instrumentos
- `CONSULTA`: apenas listagem, consulta por id e alertas

## Endpoints do modulo

- `POST /api/v1/instrumentos`
- `GET /api/v1/instrumentos`
- `GET /api/v1/instrumentos/:id`
- `PUT /api/v1/instrumentos/:id`
- `DELETE /api/v1/instrumentos/:id`
- `GET /api/v1/instrumentos/alerts/deadlines?limite_dias=30`

## Endpoints de convenetes

- `GET /api/v1/convenetes`
- `POST /api/v1/convenetes`
- `PUT /api/v1/convenetes/:id`
- `DELETE /api/v1/convenetes/:id`

## Exemplo de payload (create)

```json
{
  "proposta": "123456/2026",
  "instrumento": "987654/2026",
  "objeto": "Reforma da unidade basica de saude do bairro Centro",
  "valor_repasse": 1500000,
  "valor_contrapartida": 250000,
  "data_cadastro": "2026-03-23",
  "data_assinatura": "2026-03-20",
  "vigencia_inicio": "2026-04-01",
  "vigencia_fim": "2027-12-31",
  "data_prestacao_contas": "2028-02-15",
  "data_dou": "2026-03-25",
  "concedente": "Ministerio da Saude",
  "status": "EM_EXECUCAO",
  "responsavel": "Maria Souza",
  "orgao_executor": "Secretaria Municipal de Saude",
  "observacoes": "Aguardando plano de trabalho final"
}
```

## Proximos passos naturais

- historico/auditoria por campo alterado
- upload de documentos (DOU, termo, anexos)
- dashboard com indicadores e exportacao CSV/Excel
