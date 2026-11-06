# Portal do Colaborador (mini banco interno): plan.md

> Projeto de treino para um possível teste técnico da vaga de Desenvolvedor de Sistemas (Marcopolo, banco interno).
> Formato de trabalho: Spec-Driven Development. Cada item tem critérios de aceite. Implementar, testar, commitar.

---

## 1. Contexto e objetivo

**Cenário da vaga:** equipe pequena (3 devs) que cuida de um banco interno da empresa, com sistema legado e projeto novo. Base em TOTVS, com um frontend próprio sendo construído para simplificar as telas dos colaboradores.

**Stack que a vaga cita e que este projeto cobre:**

| Requisito da vaga | Onde aparece no projeto |
|---|---|
| React, TypeScript, JavaScript, CSS | `apps/web` (Fase 1) |
| NestJS, Node.js | `apps/api` (Fase 1 e 2) |
| Django, Python | `apps/reports` (Fase 3) |
| SQL Server (e Oracle por conceito) | Banco principal, índices, plano de execução (Fase 1) |
| MongoDB | Log de auditoria (Fase 2) |
| APIs REST e WebServices | API própria + integração com mock do TOTVS (Fase 2) |
| Arquitetura de software | ADRs, camadas, portas e adaptadores |
| Testes, homologação, implantação | Jest, Vitest, pytest, Docker Compose |
| Metodologia ágil e Governança de TI | PR só com testes verdes, definição de pronto, ADRs, controle de mudanças |

**Objetivo pessoal:** ter, em ordem de importância:
1. Algo funcionando de ponta a ponta (login, extrato, solicitação, aprovação).
2. Capacidade de explicar cada decisão no formato **decisão, alternativa, custo**.
3. Repositório público limpo para mostrar na entrevista presencial.

**Fora do escopo (de propósito):** pagamentos reais, Open Banking, mobile, Kubernetes, CI em nuvem paga, microfrontends. O foco é profundidade no essencial, não volume.

---

## 2. Regras de trabalho (para mim e para o Claude Code)

1. **Fase 1 inteira antes de qualquer outra.** Cada fase deve terminar funcionando.
2. **Spec antes do código:** para cada módulo, ler os critérios de aceite (AC) deste arquivo, escrever os testes dos AC e só então implementar.
3. **Commits pequenos** no padrão Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`).
4. **Definition of Done global** (seção 14) vale para todo item.
5. **Partes obrigatórias sem IA** (treino para teste ao vivo): ver seção 13.
6. **Explicar em voz alta:** ao terminar cada módulo, escrever 3 linhas no README em formato decisão, alternativa, custo.
7. **Nunca commitar segredos.** Só `.env.example`.
8. Quando uma decisão não estiver neste plano, registrar um ADR curto em `docs/adr/`.

---

## 3. Decisões de arquitetura (ADRs resumidos)

Cada uma vira um arquivo `docs/adr/000X-titulo.md` no repositório. Aqui ficam como roteiro de fala para a entrevista.

| # | Decisão | Alternativa considerada | Custo assumido |
|---|---|---|---|
| 1 | Monorepo simples com `apps/*` | Um repositório por serviço | Build e CI mais acoplados; em troca, setup trivial e review único |
| 2 | API NestJS em camadas por módulo (controller, service, repository/entity) | Clean Architecture completa | Menos isolamento de domínio; em troca, menos cerimônia para um projeto pequeno. Regras de negócio ficam em funções puras testáveis |
| 3 | TypeORM com migrations e SQL cru nas consultas pesadas | Prisma | Menos conforto de tipos; em troca, controle total do SQL e do plano de execução com SQL Server |
| 4 | Valores monetários em `decimal(18,2)` no banco e centavos inteiros no código | `number` com ponto flutuante | Helper de conversão; em troca, zero erro de arredondamento |
| 5 | JWT de acesso curto (15 min) | Sessão em servidor | Revogação mais difícil; em troca, API sem estado e fácil de integrar com o serviço Python |
| 6 | Integração com o TOTVS por **porta e adaptador** (anti-corruption layer) | Chamar o legado direto dos services | Uma camada a mais; em troca, o domínio não conhece o formato do legado e dá para trocar o mock pelo real |
| 7 | Legado indisponível: falhar fechado (HTTP 503) | Usar último valor conhecido | Menos disponibilidade; em troca, nunca aprovar com dado financeiro desatualizado |
| 8 | Auditoria em MongoDB | Tabela de auditoria no SQL Server | Mais um banco para operar; em troca, payload flexível, escrita append-only e não disputa o banco transacional |
| 9 | Relatórios em serviço Django separado | Gerar relatório dentro do Nest | Mais um serviço; em troca, mostra integração entre stacks e usa Python onde ele é forte (agregação e CSV) |
| 10 | Serviço Python valida o mesmo JWT (segredo compartilhado, HS256) | Gateway de autenticação | Segredo compartilhado entre serviços; em troca, simplicidade. Em produção real, usar chave assimétrica (RS256) |
| 11 | Front guarda o token em `sessionStorage` | Cookie httpOnly com refresh | Exposto a XSS; em troca, menos código. Evolução natural: cookie httpOnly e refresh token (stretch) |

---

## 4. Arquitetura geral

```
                        ┌──────────────────────────┐
                        │  apps/web (React + TS)   │
                        │  Vite, React Router,     │
                        │  TanStack Query, Zod     │
                        └─────┬──────────────┬─────┘
                  REST + JWT  │              │  REST + JWT (só MANAGER)
                              ▼              ▼
        ┌────────────────────────────┐   ┌──────────────────────────┐
        │  apps/api (NestJS)         │   │  apps/reports (Django)   │ Fase 3
        │  auth, accounts,           │◄──│  DRF, valida o JWT,      │
        │  transactions, requests    │   │  agrega e gera CSV       │
        │  hr-integration (Fase 2)   │   └──────────────────────────┘
        │  audit (Fase 2)            │      lê /internal/reports
        └───┬─────────┬──────────┬───┘      com API key de serviço
            │         │          │
            ▼         ▼          ▼
     ┌──────────┐ ┌─────────┐ ┌──────────────────────────┐
     │SQL Server│ │ MongoDB │ │ apps/legacy-totvs-mock   │ Fase 2
     │ (dados   │ │(auditoria)│ │ REST que imita o Protheus│
     │transacio-│ └─────────┘ └──────────────────────────┘
     │ nais)    │
     └──────────┘
```

---

## 5. Estrutura de pastas

```
portal-colaborador/
├── docker-compose.yml
├── .env.example
├── README.md
├── plan.md                       # este arquivo
├── docs/
│   ├── adr/                      # 0001-monorepo.md, 0002-camadas.md, ...
│   ├── sql-performance.md        # experimento de índice e plano de execução
│   └── api.http                  # requisições de exemplo (REST Client / Bruno)
├── apps/
│   ├── api/                      # NestJS
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/           # env validado com Zod ou Joi
│   │   │   ├── common/           # filters, guards, decorators, interceptors, middleware
│   │   │   ├── database/
│   │   │   │   ├── migrations/
│   │   │   │   └── seeds/
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       ├── users/
│   │   │       ├── accounts/
│   │   │       ├── transactions/
│   │   │       ├── requests/
│   │   │       │   └── rules/    # funções puras: limites, simulação, transições de status
│   │   │       ├── health/
│   │   │       ├── hr-integration/   # Fase 2
│   │   │       ├── audit/            # Fase 2
│   │   │       └── internal-reports/ # Fase 3 (endpoint para o Django)
│   │   └── test/                 # e2e com Supertest
│   ├── web/                      # React + Vite
│   │   └── src/
│   │       ├── app/              # rotas, providers, guards
│   │       ├── features/         # auth, dashboard, statement, requests, approvals, audit, reports
│   │       ├── shared/           # api client, ui, hooks, utils (formatação de moeda e data)
│   │       └── test/
│   ├── legacy-totvs-mock/        # Fase 2
│   └── reports/                  # Fase 3 (Django)
└── .github/workflows/ci.yml      # lint + testes (opcional, gratuito)
```

---

## 6. Modelo de dados (SQL Server)

**users**
- `id` uniqueidentifier PK (default `NEWID()`)
- `name` nvarchar(120), `email` nvarchar(160) UNIQUE
- `registration` varchar(20) UNIQUE (matrícula, chave para o legado na Fase 2)
- `password_hash` nvarchar(100)
- `role` varchar(10) CHECK in (`EMPLOYEE`, `MANAGER`)
- `monthly_salary` decimal(18,2) (usado até a Fase 2; depois o legado vira fonte da verdade)
- `created_at` datetime2

**accounts**
- `id` uniqueidentifier PK
- `user_id` FK users, UNIQUE (uma conta por usuário)
- `number` varchar(12) UNIQUE
- `balance` decimal(18,2) CHECK (`balance` >= 0)
- `row_version` rowversion (controle de concorrência)

**transactions** (livro-razão, só insere)
- `id` bigint IDENTITY PK
- `account_id` FK accounts
- `type` varchar(6) CHECK in (`CREDIT`, `DEBIT`)
- `amount` decimal(18,2) CHECK (`amount` > 0)
- `category` varchar(30) (SALARIO, ADIANTAMENTO, EMPRESTIMO, ALIMENTACAO, TRANSPORTE, OUTROS)
- `description` nvarchar(200)
- `balance_after` decimal(18,2)
- `created_at` datetime2

**requests**
- `id` uniqueidentifier PK
- `account_id` FK accounts
- `type` varchar(10) CHECK in (`ADVANCE`, `LOAN`)
- `amount` decimal(18,2), `installments` tinyint NULL (só para LOAN)
- `reason` nvarchar(300)
- `status` varchar(10) CHECK in (`PENDING`, `APPROVED`, `REJECTED`)
- `decided_by` FK users NULL, `decided_at` datetime2 NULL, `decision_note` nvarchar(300) NULL
- `created_at` datetime2

**Índices obrigatórios** (criar na migration, mas o experimento da seção 7.6 começa sem o índice de extrato):
- `IX_transactions_account_created` em (`account_id`, `created_at` DESC) INCLUDE (`type`, `amount`, `category`, `description`, `balance_after`)
- `IX_requests_status_created` em (`status`, `created_at`)
- `IX_requests_account` em (`account_id`, `created_at` DESC)

**Seed:** 1 gestor, 4 colaboradores, uma conta para cada e **pelo menos 100.000 transações** distribuídas em 24 meses (necessário para o experimento de performance fazer sentido). Senha de todos os usuários de seed vem do `.env`.

---

# FASE 1: Núcleo (API + SQL Server + React + testes)

Meta: fluxo completo funcionando em Docker. É a fase que mais se parece com um teste técnico real.

## 7. Backend (NestJS)

### 7.1 Setup e infraestrutura
- Projeto Nest com TypeScript em modo `strict`.
- Validação global (`ValidationPipe` com `whitelist` e `forbidNonWhitelisted`).
- Config tipada e validada na inicialização (falha rápido se faltar variável).
- Swagger em `/docs`.
- Filtro global de exceções com formato único de erro: `{ statusCode, error, message, path, timestamp, correlationId }`.
- Health check `GET /health` (API e conexão com o banco).
- Docker Compose com `sqlserver` (imagem `mcr.microsoft.com/mssql/server:2022-latest`, `ACCEPT_EULA=Y`, senha forte no `.env`), `api` e `web`. Healthcheck do SQL Server e `depends_on` com condição.
- Observação: em Mac com chip Apple, usar `platform: linux/amd64` ou a imagem `azure-sql-edge`.

**AC-1.1** `docker compose up` sobe banco, API e web sem passo manual além de copiar `.env.example` para `.env`.
**AC-1.2** `GET /health` retorna 200 com status do banco; se o banco cair, retorna 503.
**AC-1.3** Variável de ambiente ausente derruba a aplicação na subida com mensagem clara.
**AC-1.4** Qualquer erro de validação retorna 400 no formato único de erro.

### 7.2 Módulo `auth`
- `POST /auth/login` (email e senha), `GET /auth/me`.
- Senha com `bcrypt` (custo 10 a 12). JWT com `sub`, `role`, `exp` de 15 min.
- `JwtAuthGuard` global com decorator `@Public()` para exceções. `RolesGuard` com `@Roles('MANAGER')`.
- Rate limit no login (`@nestjs/throttler`, ex.: 5 tentativas por minuto por IP).

**AC-1.5** Login válido retorna 200 com `accessToken` e dados básicos do usuário, sem o hash.
**AC-1.6** Credencial inválida retorna 401 com mensagem genérica (não revela se o email existe).
**AC-1.7** Rota protegida sem token ou com token expirado retorna 401.
**AC-1.8** Rota de gestor acessada por colaborador retorna 403.
**AC-1.9** Mais de 5 tentativas de login por minuto no mesmo IP retornam 429.

### 7.3 Módulo `accounts`
- `GET /accounts/me` retorna número da conta, saldo e salário mensal.

**AC-1.10** Retorna somente a conta do usuário autenticado; não existe forma de ler a conta de outro por parâmetro.

### 7.4 Módulo `transactions` (extrato)
- `GET /accounts/me/transactions` com filtros: `from`, `to` (ISO), `type`, `category`, `page` (padrão 1), `pageSize` (padrão 20, máximo 100), `sort` (`createdAt:desc` padrão).
- Resposta: `{ items, page, pageSize, total, summary: { totalCredit, totalDebit } }`.
- A consulta e o somatório devem usar SQL otimizado (query builder ou SQL cru parametrizado). Nada de carregar tudo em memória.

**AC-1.11** Sem filtros, retorna a primeira página, ordenada da mais recente para a mais antiga.
**AC-1.12** `from` maior que `to` retorna 400.
**AC-1.13** `pageSize` acima de 100 retorna 400.
**AC-1.14** `summary` bate com a soma real das transações do filtro, não só da página.
**AC-1.15** Colaborador nunca vê transações de outra conta, mesmo manipulando parâmetros.
**AC-1.16** Consulta de 30 dias sobre a base de seed responde em menos de 100 ms depois do índice criado (medir e registrar em `docs/sql-performance.md`).

### 7.5 Módulo `requests` (solicitações e aprovação)

**Regras de negócio** (todas em `rules/` como funções puras, com testes unitários):
- `ADVANCE` (adiantamento): valor máximo de 40% do salário mensal. Sem parcelas.
- `LOAN` (empréstimo): valor máximo de 3 vezes o salário mensal, parcelas de 1 a 12.
- Só pode existir **uma** solicitação `PENDING` por tipo e por conta.
- Simulação de empréstimo: taxa fixa de 1,5% ao mês, tabela Price: `parcela = P * i / (1 - (1 + i)^-n)`, arredondada em centavos.
- Transições válidas: `PENDING` para `APPROVED` ou `REJECTED`. Qualquer outra transição é inválida.
- Quem decide precisa ser `MANAGER` e **não pode decidir a própria solicitação**.
- Recusa exige `decision_note` com pelo menos 10 caracteres.
- Aprovação, no **mesmo** transação de banco: muda o status, cria `CREDIT` em `transactions` (categoria `ADIANTAMENTO` ou `EMPRESTIMO`), atualiza `accounts.balance` e preenche `balance_after`.

**Endpoints**
- `POST /requests/simulate` (tipo, valor, parcelas): retorna valor da parcela, total a pagar e juros. Não grava nada.
- `POST /requests`: cria solicitação (`PENDING`).
- `GET /requests`: colaborador vê as suas; gestor vê todas, com filtros `status`, `type`, paginação.
- `GET /requests/:id`: dono ou gestor.
- `PATCH /requests/:id/decision`: `{ decision: 'APPROVED' | 'REJECTED', note? }`, só gestor.

**AC-1.17** Adiantamento acima de 40% do salário retorna 422 com a regra violada na mensagem.
**AC-1.18** Empréstimo com 13 parcelas ou valor acima de 3 salários retorna 422.
**AC-1.19** Segunda solicitação `PENDING` do mesmo tipo e conta retorna 409.
**AC-1.20** `simulate` para R$ 3.000,00 em 6 parcelas devolve parcela de R$ 526,59 (conferir no teste unitário com a fórmula).
**AC-1.21** Gestor aprovando a própria solicitação retorna 403.
**AC-1.22** Recusa sem nota válida retorna 400.
**AC-1.23** Aprovação cria exatamente uma transação `CREDIT`, atualiza o saldo e o `balance_after` coerentemente.
**AC-1.24** Se qualquer passo da aprovação falhar, nada é gravado (teste forçando falha no meio).
**AC-1.25** **Concorrência:** duas aprovações simultâneas da mesma solicitação resultam em apenas uma efetivada; a outra retorna 409. Implementar com `UPDATE ... WHERE status = 'PENDING'` conferindo `affectedRows = 1`, dentro da transação.
**AC-1.26** Decidir uma solicitação já decidida retorna 409.
**AC-1.27** Colaborador não consegue ler a solicitação de outro (404, para não vazar existência).

### 7.6 Experimento de SQL (obrigatório, vira documento)

Arquivo `docs/sql-performance.md`, preenchido durante o desenvolvimento:
1. Rodar a migration **sem** o índice `IX_transactions_account_created`.
2. Executar a consulta do extrato (30 dias, uma conta) com `SET STATISTICS IO ON` e `SET STATISTICS TIME ON`, e salvar o plano de execução real. Anotar: operador (Clustered Index Scan?), leituras lógicas, tempo.
3. Criar o índice e repetir. Anotar: operador (Index Seek?), leituras lógicas, tempo.
4. Escrever a conclusão em 5 linhas: o que mudou, por que a coluna `created_at` está em ordem descendente, o que o `INCLUDE` evita (Key Lookup), e o custo (espaço e escrita mais lenta).
5. Bônus: demonstrar um caso de **parameter sniffing** ou de função na coluna do `WHERE` que impede o uso do índice (`WHERE CONVERT(date, created_at) = ...` contra a forma sargável).

**AC-1.28** O documento existe, com antes e depois medidos, e eu consigo explicar de memória a diferença entre Scan e Seek.

### 7.7 Testes do backend
- **Unitários (Jest):** regras de `requests/rules`, cálculo Price, validação de transições. Meta: 100% das funções de regra cobertas.
- **Integração/e2e (Supertest + banco de teste):** fluxo completo login, solicitar, aprovar, ver extrato. Banco de teste em container descartável.
- Cobertura mínima de 80% nos módulos `requests` e `transactions`.

**AC-1.29** `npm test` e `npm run test:e2e` passam em ambiente limpo.

## 8. Frontend (React + TypeScript)

**Stack:** Vite, React 18, TypeScript `strict`, React Router, TanStack Query, React Hook Form + Zod, Axios (instância com interceptor de token e tratamento de 401), CSS Modules ou Tailwind. Testes com Vitest e Testing Library.

### Telas
1. **Login:** formulário validado, mensagem de erro clara, redireciona conforme o perfil.
2. **Dashboard:** saldo, últimas 5 transações, atalho para solicitar.
3. **Extrato:** filtros (período, tipo, categoria), tabela paginada, totais de crédito e débito. Filtros refletidos na URL (query string), então um link compartilha o mesmo resultado.
4. **Minhas solicitações:** lista com status colorido (e com texto, não só cor) e botão de nova solicitação.
5. **Nova solicitação:** formulário com **simulador** que atualiza parcela e total ao digitar (com debounce), mostrando as regras (limite de 40% ou 3 salários) antes do envio.
6. **Fila de aprovações (gestor):** lista de pendentes, modal para aprovar ou recusar (nota obrigatória na recusa).

### Qualidade de UI
- Estados de carregamento, vazio e erro em toda lista.
- Moeda formatada com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; datas em pt-BR.
- Acessibilidade básica: labels, foco visível, navegação por teclado, contraste adequado.
- Layout responsivo (funciona em tela de 360 px).
- Guard de rota por perfil; token expirado leva ao login com mensagem.

**AC-1.30** Colaborador não vê o menu nem acessa a rota de aprovações (redireciona).
**AC-1.31** Alterar filtro do extrato atualiza a URL; recarregar a página mantém o filtro.
**AC-1.32** Simulador mostra a parcela correta e bloqueia o botão de envio quando a regra é violada, explicando o motivo.
**AC-1.33** Erros do backend (422, 409) aparecem como mensagem legível, não como erro técnico.
**AC-1.34** Dois testes de componente (formulário de solicitação e tabela do extrato) e um teste do hook do simulador passam.

## 9. Entregáveis da Fase 1 (checklist)

- [ ] Docker Compose sobe tudo
- [ ] Migrations e seed com 100 mil transações
- [ ] Auth com JWT, guards e rate limit
- [ ] Extrato com filtros, paginação e totais
- [ ] Solicitações com regras, simulação e aprovação transacional
- [ ] Teste de concorrência da aprovação
- [ ] `docs/sql-performance.md` com antes e depois
- [ ] 6 telas funcionando
- [ ] Testes unitários, e2e e de componente passando
- [ ] README com como rodar, decisões (ADRs) e prints
- [ ] Tag `v0.1.0` no Git

---

# FASE 2: Integração com legado (TOTVS mock) e MongoDB

Meta: mostrar que você integra sistemas legados com cuidado e que sabe quando usar NoSQL. É o mesmo tipo de trabalho que você fez no SEFAZ e no TCE.

## 10. Serviço `legacy-totvs-mock`

Aplicação pequena (Express ou Nest) que imita um REST do Protheus. Formato propositalmente "feio", como legado costuma ser, para justificar a camada anticorrupção:

- `GET /rest/funcionarios/:matricula` retorna algo como:
  `{ "RA_MAT": "000123", "RA_NOME": "MARIA SILVA", "RA_SALARIO": "4500.00", "RA_SITUACAO": "A", "RA_CC": "CC-014" }`
  (campos em maiúsculas, números como string, situação `A` ativo, `D` demitido, `F` afastado).
- `GET /rest/folha/:matricula/:aaaamm` retorna holerite simplificado (proventos, descontos, líquido) com nomes de campos no padrão legado.
- Autenticação Basic Auth ou token fixo configurável.
- Configurações por variável de ambiente para simular problemas: `LATENCY_MS`, `FAILURE_RATE` (0 a 1) e `FORCE_DOWN=true`.
- Dados de teste coerentes com a seed da Fase 1 (mesmas matrículas e salários).

**AC-2.1** Sem credencial retorna 401; matrícula inexistente retorna 404 no formato legado.
**AC-2.2** Com `FAILURE_RATE=0.3`, cerca de 30% das chamadas falham com 500/503 (permite testar retry).

## 11. Módulo `hr-integration` no NestJS

**Estrutura (portas e adaptadores):**
```
hr-integration/
├── domain/
│   ├── employee.ts              # tipo de domínio limpo (registration, name, salary: number em centavos, active: boolean)
│   └── hr-gateway.port.ts       # interface HrGateway { getEmployee(registration): Promise<Employee> }
├── infra/
│   ├── totvs-hr.gateway.ts      # implementação HTTP
│   ├── totvs.mapper.ts          # RA_* para Employee (anti-corruption layer)
│   └── in-memory-hr.gateway.ts  # implementação para testes
└── hr-integration.module.ts
```

**Comportamento do adaptador:**
- Timeout de 2 s, **retry** com backoff exponencial (3 tentativas, só para erros 5xx e timeout, nunca para 4xx).
- **Circuit breaker simples:** após 5 falhas consecutivas, abre por 30 s e responde direto com falha (implementação própria pequena ou biblioteca; explicar o que é e por que existe).
- **Cache** em memória com TTL de 5 minutos por matrícula (e estratégia de invalidação documentada).
- Logs estruturados com `correlationId` em cada chamada ao legado.
- Mapeamento valida o payload do legado com Zod; formato inesperado vira erro tratado, não `undefined` espalhado.

**Uso no domínio:**
- Ao criar ou simular solicitação, o salário e a situação vêm do legado, não do banco local.
- Funcionário com situação diferente de `A` não pode solicitar.
- Se o legado estiver indisponível, a API responde **503** com mensagem clara (ADR 7: falhar fechado).

**AC-2.3** Com o mock saudável, o limite de 40% usa o salário do legado (alterar o salário no mock muda o limite).
**AC-2.4** Com `FAILURE_RATE=0.3`, o fluxo normal ainda funciona na maioria das vezes graças ao retry (teste com mock HTTP determinístico simulando 2 falhas e 1 sucesso).
**AC-2.5** Com `FORCE_DOWN=true`, a API retorna 503 em menos de ~8 s e o circuit breaker abre após 5 falhas (as chamadas seguintes retornam em milissegundos).
**AC-2.6** Segunda consulta à mesma matrícula dentro de 5 minutos não chama o legado (verificar por contador no teste).
**AC-2.7** Funcionário demitido ou afastado recebe 422 ao solicitar.
**AC-2.8** Troca do `TotvsHrGateway` pelo `InMemoryHrGateway` nos testes de `requests` não exige alterar nenhum service de domínio (prova da porta).

## 12. Auditoria em MongoDB (módulo `audit`)

**Coleção `audit_logs` (documento):**
```json
{
  "eventType": "REQUEST_DECIDED",
  "actorId": "uuid",
  "actorRole": "MANAGER",
  "entity": "request",
  "entityId": "uuid",
  "payload": { "decision": "APPROVED", "amount": 1200.00, "note": "ok" },
  "ip": "172.18.0.1",
  "correlationId": "uuid",
  "createdAt": "2026-11-10T14:03:22Z"
}
```

**Eventos auditados:** `LOGIN_SUCCESS`, `LOGIN_FAILED`, `REQUEST_CREATED`, `REQUEST_DECIDED`, `HR_LEGACY_FAILURE`.

**Implementação:**
- `@nestjs/mongoose` com schema tipado.
- Emissão por eventos internos (`@nestjs/event-emitter`): os services publicam, o módulo `audit` escuta. **Falha na auditoria nunca pode derrubar a operação de negócio** (log do erro e segue).
- Índices: `{ createdAt: -1 }`, `{ actorId: 1, createdAt: -1 }`, `{ eventType: 1, createdAt: -1 }`. Opcional: TTL de 365 dias.
- `GET /audit` (só gestor) com filtros `actorId`, `eventType`, `from`, `to` e paginação.
- Middleware que gera `correlationId` por requisição (header `x-correlation-id`) e propaga para logs, auditoria e chamadas ao legado.

**Tela nova no front (gestor):** "Auditoria", com filtros e tabela, mostrando o payload expansível.

**AC-2.9** Criar e decidir solicitação gera os eventos correspondentes com o mesmo `correlationId` da requisição.
**AC-2.10** Com o MongoDB parado, aprovar uma solicitação ainda funciona (e o erro de auditoria vai para o log).
**AC-2.11** Colaborador recebe 403 em `GET /audit`.
**AC-2.12** `GET /audit?eventType=LOGIN_FAILED&from=...` usa o índice (conferir com `explain()` e registrar em `docs/mongo-notes.md`).
**AC-2.13** `docs/mongo-notes.md` explica em 8 linhas quando usar Mongo e quando não usar, comparando com o SQL Server deste projeto (ex.: por que **saldo e transações ficam no SQL**: integridade transacional).

## 13. Treino sem IA (a partir da Fase 2, repetir na Fase 3)

Para simular teste ao vivo, **sem assistente de IA e só com documentação oficial**:
- Reescrever do zero, cronometrado (2 h), `POST /requests` com validação e as regras de 40% e 3 salários, mais um teste unitário.
- Reescrever do zero, cronometrado (1 h 30), o formulário React da solicitação com React Hook Form + Zod.
- Escrever à mão, sem copiar, 3 consultas SQL: extrato por período com totais (`GROUP BY` e `SUM`), top 3 categorias de débito do mês, solicitações pendentes há mais de 5 dias com `JOIN` em usuários.
- Anotar onde travou. Isso vira a lista de revisão antes do teste.

## 14. Definition of Done (global)

- Critérios de aceite do item cobertos por teste automatizado.
- Lint e formatação sem erro (ESLint + Prettier; Ruff na Fase 3).
- Nenhum `any` novo sem justificativa em comentário (TypeScript).
- Sem segredo no repositório; variáveis novas entram no `.env.example`.
- README e, quando couber, ADR atualizados.
- Commit em Conventional Commits; PR (mesmo sozinho) só com testes verdes.
- Erros tratados com mensagem útil; nenhum stack trace vaza para o cliente.

## 15. Entregáveis da Fase 2 (checklist)

- [ ] `legacy-totvs-mock` com falha e latência configuráveis
- [ ] Porta, adaptador e mapper do TOTVS
- [ ] Retry, circuit breaker e cache com testes
- [ ] Auditoria em MongoDB com eventos e `correlationId`
- [ ] Tela de auditoria
- [ ] `docs/mongo-notes.md`
- [ ] Sessão de treino sem IA feita e anotada
- [ ] Tag `v0.2.0`

---

# FASE 3: Serviço Python (Django) de relatórios

Meta: mostrar que você conversa com Python/Django sem mentir sobre a experiência. Pequeno, mas bem feito. Django foi escolhido porque a vaga cita Django.

## 16. Endpoint interno no NestJS (`internal-reports`)

- `GET /internal/reports/monthly-data?month=2026-11`, protegido por **API key de serviço** (header `x-service-key`, valor no `.env`), nunca por JWT de usuário.
- Retorna dados brutos do mês: solicitações (id, tipo, valor, status, `created_at`, `decided_at`, matrícula do solicitante) e totais de transações por categoria.
- Não expõe senha, e-mail nem dados desnecessários (princípio do mínimo necessário).

**AC-3.1** Sem a chave ou com chave errada retorna 401; com JWT de usuário (sem chave) também retorna 401.
**AC-3.2** `month` inválido retorna 400.

## 17. Serviço `apps/reports` (Django + DRF)

**Setup:** Python 3.12, Django 5, Django REST Framework, `PyJWT`, `requests` (ou `httpx`), `pytest` + `pytest-django` + `responses` (ou `respx`), Ruff. Sem banco próprio relevante (usar SQLite apenas para o que o Django exige).

**Autenticação:** classe de autenticação DRF que valida o **mesmo JWT** emitido pelo Nest (HS256, segredo do `.env`), exigindo `role == MANAGER`.

**Endpoints:**
- `GET /reports/monthly/?month=2026-11` retorna JSON:
  ```json
  {
    "month": "2026-11",
    "requests": { "total": 18, "approved": 11, "rejected": 4, "pending": 3 },
    "approvedAmount": { "advance": 14500.00, "loan": 62000.00 },
    "avgDecisionHours": 7.4,
    "byEmployee": [ { "registration": "000123", "approvedAmount": 5200.00, "requests": 3 } ],
    "debitByCategory": [ { "category": "ALIMENTACAO", "total": 8120.50 } ]
  }
  ```
- `GET /reports/monthly/export/?month=2026-11` retorna **CSV** (`Content-Disposition: attachment`), com cabeçalho e valores formatados de forma consistente.
- `GET /reports/health/`.

**Organização do código:**
```
reports/
├── manage.py
├── config/                  # settings, urls
└── reports_app/
    ├── clients/portal_api.py        # chamada ao endpoint interno (timeout, tratamento de erro)
    ├── services/aggregation.py      # funções puras de agregação (as que mais testamos)
    ├── services/csv_export.py
    ├── auth.py                      # JWT authentication class
    ├── serializers.py
    ├── views.py
    └── tests/
```

**Regras:**
- Agregação em funções puras, sem I/O, testáveis com listas de dicionários.
- Se o Nest estiver fora do ar, o serviço responde 502 com mensagem clara; timeout de 5 s.
- Valores monetários com `Decimal`, nunca `float`.
- Mês sem dados retorna estrutura zerada, não erro.

**AC-3.3** Sem token ou com token de colaborador: 401 e 403, respectivamente.
**AC-3.4** Agregação calcula corretamente contagens por status, soma por tipo e média de horas até decisão (teste com massa pequena conferida à mão).
**AC-3.5** CSV abre corretamente no Excel (UTF-8 com BOM, separador `;` e decimal com vírgula, escolha documentada no README).
**AC-3.6** Nest fora do ar resulta em 502, não em 500 com stack trace.
**AC-3.7** `pytest` passa em ambiente limpo (com o cliente HTTP mockado).

## 18. Frontend da Fase 3

- Tela **Relatório mensal** (gestor): seletor de mês, cards com totais, tabela por colaborador, gráfico simples (Recharts) de débito por categoria e botão "Exportar CSV".
- O front chama o serviço Django diretamente com o mesmo JWT (URL base em variável de ambiente).

**AC-3.8** Gestor vê o relatório e baixa o CSV; colaborador não vê o menu.
**AC-3.9** Mês sem dados mostra estado vazio amigável.

## 19. Docker e README finais

- `docker-compose.yml` final com: `sqlserver`, `mongo`, `api`, `web`, `legacy-totvs-mock`, `reports`.
- Perfis do Compose (`profiles`) para subir só o núcleo (`core`) ou tudo (`full`).
- README com: visão geral, diagrama da seção 4, como rodar, usuários de seed, tabela de ADRs, como rodar os testes, limitações conhecidas e próximos passos.
- `docs/api.http` com todas as requisições (login, extrato, solicitar, aprovar, auditoria, relatório).

## 20. Entregáveis da Fase 3 (checklist)

- [ ] Endpoint interno com API key
- [ ] Serviço Django com JWT compartilhado
- [ ] Agregações com testes
- [ ] Exportação CSV
- [ ] Tela de relatório
- [ ] Compose completo com perfis
- [ ] README final e ADRs completos
- [ ] Tag `v1.0.0`

---

## 21. Marcos e ordem sugerida

| Marco | Conteúdo | Resultado verificável |
|---|---|---|
| M1 | Setup, Compose, banco, migrations, seed | `docker compose up` e `/health` ok |
| M2 | Auth e guards | AC-1.5 a 1.9 verdes |
| M3 | Extrato e experimento SQL | AC-1.11 a 1.16 e documento de performance |
| M4 | Solicitações, regras e aprovação | AC-1.17 a 1.27 verdes |
| M5 | Front: login, dashboard, extrato | Fluxo de leitura navegável |
| M6 | Front: solicitações, simulador, aprovações | Fluxo completo no navegador |
| M7 | Testes e README da Fase 1 | Tag `v0.1.0` |
| M8 | Mock do TOTVS e adaptador | AC-2.1 a 2.8 |
| M9 | Auditoria em Mongo e tela | AC-2.9 a 2.13, tag `v0.2.0` |
| M10 | Serviço Django e tela de relatório | AC-3.1 a 3.9 |
| M11 | Acabamento, treino sem IA, README final | Tag `v1.0.0` |

**Se o tempo apertar** (teste técnico real costuma durar 1 a 2 dias): M1 a M7 já é um projeto completo. Fases 2 e 3 são diferenciais para a conversa e para você aprender a stack.

---

## 22. Roteiro de fala para a entrevista presencial

Para cada ponto, responder em 30 a 60 segundos com **decisão, alternativa e custo**:

1. Por que camadas por módulo e não Clean Architecture completa (ADR 2)?
2. Como garantiu que duas aprovações simultâneas não duplicam o crédito (AC-1.25)?
3. O que mudou no plano de execução depois do índice e por que (7.6)?
4. Por que decimal no banco e centavos no código (ADR 4)?
5. Por que o salário passou a vir do legado e o que acontece se o legado cair (ADR 6 e 7)?
6. Para que serve o circuit breaker e quando ele atrapalha?
7. Por que auditoria em Mongo e saldo em SQL Server (ADR 8)?
8. Como o serviço Django confia no usuário sem ter banco de usuários (ADR 10) e qual o risco do segredo compartilhado?
9. O que você faria diferente com mais tempo (refresh token em cookie httpOnly, RS256, fila para auditoria, observabilidade)?
10. Onde estão os testes e como você sabe que a regra de negócio está protegida?

**Frase-chave de honestidade (para React, Node e Django):** "Venho de C# e Angular, mas já troquei de stack na prática com o Laravel no TCE. Para me preparar para esta vaga, construí este projeto com NestJS, React e Django; o repositório está aqui e posso explicar cada decisão."

---

## 23. Prompt inicial sugerido para o Claude Code

```
Leia o plan.md inteiro. Vamos executar em Spec-Driven Development, uma fase por vez.
Comece APENAS pela Fase 1, marco M1: monorepo com apps/api (NestJS strict), apps/web (Vite + React + TS),
docker-compose.yml com SQL Server 2022 e healthchecks, .env.example, migrations das tabelas da seção 6
(sem o índice IX_transactions_account_created, que será criado no experimento 7.6) e seed com 100 mil transações.
Antes de implementar, liste os testes que vão cobrir AC-1.1 a AC-1.4, depois implemente.
Faça commits pequenos em Conventional Commits. Não avance para o M2 sem eu confirmar.
Em cada decisão não prevista no plano, crie um ADR curto em docs/adr/.
```

---

## 24. Riscos e atenção

- **Tentar fazer tudo.** A Fase 1 sozinha já é um bom teste técnico. Não começar a Fase 2 com a 1 pela metade.
- **Depender demais da IA.** Usar para acelerar boilerplate; escrever à mão as regras de negócio, o formulário React e as consultas SQL (seção 13).
- **Código que você não consegue explicar.** Se não explicar em voz alta, não entra no repositório.
- **Segredos e dados.** Dados de seed fictícios, senhas fora do Git, nada de dados reais da Marcopolo ou de qualquer empregador.
- **Esquecer do README.** Em teste técnico, o README bem escrito costuma pesar quase tanto quanto o código.
