# 0001: Monorepo

- **Status:** Aceito
- **Data:** 2026-11-06

## Contexto
Qual tipo de estrutura seria implementada.

## Decisão
Pelo tamanho e uso desse projeto (uma preparação de um teste técnico), optei por Monorepo.

## Alternativas consideradas
Um repositório por serviço, mas pelo tamanho do projeto, não se valeria a pena montar CI/CD separados para eles.

## Consequências (custo)
Build e CI acoplados; em troca, setup trivial e review único.