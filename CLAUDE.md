# CLAUDE.md: Portal do Colaborador (mini banco interno)

Diretivas para o Claude Code neste repositório. A **fonte da verdade** de escopo, critérios de aceite (AC) e modelo de dados é o [plan.md](plan.md). Este arquivo resume **como trabalhar**; o plan.md diz **o que fazer**. Em conflito, o plan.md vence e a divergência deve ser apontada.

---

## 1. Quem é o desenvolvedor e como explicar

- Gustavo vem de **C#/.NET (Framework e Core)**, **Angular** e **PHP/Laravel**. Conhecimento de **NestJS, React e Python/Django: começando do zero**.
- Projeto de treino para teste técnico e entrevista. Objetivo: entender e conseguir **explicar em voz alta** cada linha. Código que ele não consegue explicar não entra.
- Ao introduzir qualquer conceito novo, **fazer a equivalência** com o que ele já conhece, quando existir:
  - React → Angular (ex.: `useEffect` ≈ `ngOnInit`/`ngOnChanges`/`ngOnDestroy`; Context ≈ service `providedIn: 'root'`; React Router ≈ Angular Router; guard de rota ≈ `CanActivate`).
  - NestJS → Angular (módulos, DI, decorators) e ASP.NET Core (controllers, middleware, filters, pipeline).
  - TypeORM → Entity Framework Core (migrations, entidades, `DataSource` ≈ `DbContext`).
  - Django/DRF → Laravel e ASP.NET (views ≈ controllers, `settings.py` ≈ `appsettings.json`/`.env`, `manage.py` ≈ `artisan`/`dotnet` CLI).
  - Python → C# (tipagem, `Decimal` ≈ `decimal`, list comprehension ≈ LINQ `Select`/`Where`).
  - Se não houver equivalente, dizer isso explicitamente em vez de forçar a comparação.
- Respostas e documentação em **português**. Código (nomes de variáveis, funções, tabelas) em **inglês**, como no plan.md.
- Ambiente: **Windows 11**, PowerShell, Docker Desktop, Node 26 LTS (imagens Docker `node:26-alpine`), Python 3.13 local (containers usam Python 3.12).

## 2. Regras de trabalho (obrigatórias)

1. **Uma fase por vez, um marco por vez** (M1 → M11, seção 21 do plan.md). Fase 1 inteira antes da Fase 2. **Não avançar de marco sem confirmação do Gustavo.**
2. **Spec-Driven Development:** antes de implementar um módulo, listar os AC envolvidos e os testes que vão cobri-los; escrever os testes; só então implementar.
3. **Commits pequenos em Conventional Commits** (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`). Escopo opcional por app: `feat(api): ...`, `feat(web): ...`. Commitar só quando pedido ou ao fim de uma etapa acordada.
4. **Decisão não prevista no plano → ADR curto** em `docs/adr/000X-titulo.md` (contexto, decisão, alternativa, custo).
5. **Ao terminar cada módulo:** 3 linhas no README no formato **decisão, alternativa, custo**.
6. **Nunca commitar segredos.** Só `.env.example`; toda variável nova entra nele. Dados de seed sempre fictícios.
7. **O Gustavo escreve todo o código; o Claude é tutor.** O objetivo é conseguir montar o projeto do zero, sem IA (pior cenário do teste técnico). Portanto o Claude **não cria nem edita arquivos de código, config, Docker, migrations ou testes**; em vez disso:
   - **Delega** cada etapa como uma tarefa pequena: objetivo, AC envolvidos, comandos, o que pesquisar na documentação oficial, critério de pronto.
   - **Explica antes** o conceito (com as equivalências da seção 1) e aponta o link da documentação oficial, para criar o hábito de consultar a doc e não a IA.
   - **Dá dicas progressivas** quando ele travar (primeiro uma pista, depois o caminho, só por último um trecho de código), em vez de entregar a solução.
   - **Revisa** o que ele escreveu (ler os arquivos, rodar testes/lint) e aponta erros, riscos e melhorias, explicando o porquê.
   - Só escreve código quando o Gustavo pedir explicitamente para aquele trecho. Exceções sem precisar pedir: CLAUDE.md (incluindo as seções 7 de pendências e 8 de comandos).
   - Partes de treino cronometrado (seção 13 do plan.md) continuam valendo como revisão antes do teste.
8. Foco em profundidade, não volume. Nada fora do escopo (pagamentos reais, Open Banking, mobile, Kubernetes, microfrontends).

## 3. Definition of Done (todo item)

- AC do item cobertos por teste automatizado.
- Lint e formatação sem erro: **oxlint** + Prettier na API (diverge do plan.md, que cita ESLint; ver ADR 0013), Ruff na Fase 3.
- TypeScript `strict`; **nenhum `any` novo** sem comentário justificando.
- Sem segredo no repositório; `.env.example` atualizado.
- README e, quando couber, ADR atualizados.
- Testes verdes antes de commit/PR.
- Erros com mensagem útil; **nenhum stack trace vaza para o cliente**.

## 4. Estrutura do monorepo

```
apps/api/                 NestJS (Fase 1+)
apps/web/                 React + Vite (Fase 1+)
apps/legacy-totvs-mock/   mock do Protheus (Fase 2)
apps/reports/             Django + DRF (Fase 3)
docs/adr/                 ADRs
docs/sql-performance.md   experimento de índice (7.6)
docs/mongo-notes.md       (Fase 2)
docs/api.http             requisições de exemplo
docker-compose.yml        perfis core/full (Fase 3)
```

API organizada em **camadas por módulo** (controller, service, repository/entity) em `apps/api/src/modules/<modulo>/`. Infra transversal em `src/common/` (filters, guards, decorators, interceptors, middleware) e `src/config/`.

## 5. Convenções técnicas (decisões já tomadas, ver ADRs na seção 3 do plan.md)

**Dinheiro**
- Banco: `decimal(18,2)`. Código: **centavos inteiros** (`number` inteiro em TS, `Decimal` em Python). Nunca ponto flutuante para valores. Conversão em helper único.

**Banco (SQL Server 2022)**
- TypeORM com **migrations** (nunca `synchronize: true`). Consultas pesadas (extrato, somatórios) com query builder ou **SQL cru parametrizado**; nunca carregar tudo em memória.
- O índice `IX_transactions_account_created` **não** entra na migration inicial: é criado no experimento da seção 7.6.
- `transactions` é livro-razão: **só INSERT**.
- Aprovação de solicitação: tudo na **mesma transação**; concorrência com `UPDATE ... WHERE status = 'PENDING'` conferindo `affectedRows = 1` (senão 409).
- Seed: 1 gestor, 4 colaboradores, ≥ 100.000 transações em 24 meses; senha da seed vem do `.env`.

**API (NestJS)**
- `ValidationPipe` global com `whitelist` e `forbidNonWhitelisted`.
- Config validada na subida (falha rápido se faltar variável).
- Formato único de erro: `{ statusCode, error, message, path, timestamp, correlationId }`.
- `JwtAuthGuard` global + `@Public()`; `RolesGuard` + `@Roles('MANAGER')`. JWT HS256, 15 min, com `sub` e `role`. bcrypt custo 10 a 12.
- Swagger em `/docs`; health em `GET /health`.
- Dados do usuário sempre a partir do token (`/me`), nunca por id em parâmetro.

**Mapa de status HTTP**
| Situação | Status |
|---|---|
| Validação de entrada / recusa sem nota | 400 |
| Sem token, token inválido/expirado, credencial errada (mensagem genérica) | 401 |
| Perfil sem permissão, gestor decidindo a própria solicitação | 403 |
| Recurso de outro usuário (não vazar existência) | 404 |
| Solicitação PENDING duplicada, decisão já tomada, corrida de aprovação | 409 |
| Regra de negócio violada (limites, funcionário inativo) | 422 |
| Rate limit do login | 429 |
| Serviço Django sem acesso ao Nest | 502 |
| Banco fora (health) / legado TOTVS indisponível (falhar fechado) | 503 |

**Frontend (React)**
- Vite, React 18, TS strict, React Router, TanStack Query, React Hook Form + Zod, Axios com interceptor (token + 401).
- Token em `sessionStorage` (ADR 11).
- Moeda com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`; datas pt-BR.
- Toda lista com estados de carregamento, vazio e erro. Acessibilidade básica, responsivo até 360 px. Status com texto, não só cor.
- Filtros do extrato na URL (query string).

**Fase 2 e 3 (só quando chegar lá)**
- TOTVS por **porta e adaptador**; domínio nunca conhece campos `RA_*`. Timeout 2 s, retry 3x só em 5xx/timeout, circuit breaker (5 falhas, 30 s), cache 5 min, payload validado com Zod.
- Auditoria em MongoDB via eventos internos; **falha de auditoria nunca derruba a operação**.
- `correlationId` (header `x-correlation-id`) propagado para logs, auditoria e legado.
- Django valida o mesmo JWT (HS256) exigindo `MANAGER`; endpoint interno do Nest usa `x-service-key`, nunca JWT. Agregação em funções puras; CSV UTF-8 com BOM, `;` e vírgula decimal.

## 6. Testes

- API: Jest (unitário; 100% das funções em `requests/rules`), Supertest para e2e com banco de teste em container descartável. Cobertura ≥ 80% em `requests` e `transactions`.
- Web: Vitest + Testing Library.
- Reports: pytest + pytest-django + mock de HTTP.
- AC-1.29: `npm test` e `npm run test:e2e` passam em ambiente limpo.

## 7. Pendências de documentação

ADRs a escrever em `docs/adr/` (até o fim do M1 ou no M7, antes da tag `v0.1.0`). Formato: Contexto, Decisão, Alternativas consideradas (com motivo do descarte), Consequências (bônus e ônus da escolhida). Nome com 4 dígitos: `0003-titulo.md`.

- [x] 0001 monorepo, 0002 camadas por módulo (rascunhos feitos; revisar)
- [ ] 0003 a 0011: transcrever da seção 3 do plan.md
- [ ] 0012 CommonJS: Nest 12 é ESM-only; CJS depende de `require(esm)`; Jest exige Node ≥ 24.9 + `--experimental-vm-modules` (experimental). Alternativa ESM: Jest ESM experimental e TypeORM CLI com loaders extras.
- [ ] 0013 oxlint: padrão do template Nest 12, rápido, sem config. Alternativa ESLint + typescript-eslint (citado no plan.md). Custo: menos regras/plugins e regras com tipo limitadas.
- [ ] 0014 Node 26 LTS: Node 22.14 quebrou (Nest CLI 12 exige ≥ 22.22.3; Jest `require(esm)` exige ≥ 24.9). Alternativa Node 24 (sem pacote no winget). Imagens `node:26-alpine`. Custo: versão mais nova, menos testada pelo ecossistema.

Outras decisões em aberto:
- [ ] Idioma dos títulos de teste (`describe`/`it`): hoje em português. Proposta: inglês dentro do código, citando o AC no título (`'AC-1.4: ...'`); pt-BR só em mensagens ao usuário final e na documentação. Gustavo adiou a decisão.

## 8. Comandos

> Preencher conforme os apps forem criados.

```powershell
copy .env.example .env      # primeira vez
docker compose up -d        # sobe sqlserver, api, web
```

**Docker / SQL Server** (rodar na raiz)
```powershell
docker compose up -d                 # sobe o SQL Server (volume sqlserver-data)
docker compose ps                    # deve mostrar (healthy)
docker compose logs sqlserver        # diagnóstico se o container cair
docker compose down                  # para e remove o container; o volume (dados) fica
docker compose down -v               # remove TAMBÉM o volume (apaga os bancos)
docker compose exec sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "<senha>" -C   # console SQL (GO executa)
```
- `sqlcmd` 18 exige `-C` (TrustServerCertificate) por causa do certificado autoassinado.
- No Git Bash, usar `MSYS_NO_PATHCONV=1` antes de comandos com caminhos `/opt/...` (senão vira caminho do Windows).

**apps/api** (rodar dentro de `apps/api`)
```powershell
npm run start:dev           # API em http://localhost:3000 com watch
npm test                    # unitários (Jest)
npm run test:e2e            # e2e (Jest + Supertest)
npm run test:cov            # cobertura
npm run build               # compila para dist/ via tsconfig.build.json
npm run lint                # oxlint
```

Particularidades do setup (Nest 12):
- Projeto em **CommonJS**, mas os pacotes `@nestjs/*` 12 são ESM-only. O Jest só faz `require(esm)` com **Node ≥ 24.9 e a flag `--experimental-vm-modules`**; por isso os scripts de teste chamam `node --experimental-vm-modules node_modules/jest/bin/jest.js` em vez de `jest`.
- `tsconfig.json` (editor/Jest, `rootDir: ./`) vs `tsconfig.build.json` (build, `rootDir: ./src`), como `tsconfig.json` vs `tsconfig.app.json` no Angular.
