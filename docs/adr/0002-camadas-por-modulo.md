# 0002: Camadas por módulo

- **Status:** Aceito
- **Data:** 2026-11-06

## Contexto
É um projeto pequeno de estudo, para preparação de um teste técnico.

## Decisão
Nest em camadas por módulo; regras em funções puras.

## Alternativas consideradas
Clean Architecture completa não vale a pena pelo tamanho do projeto e pelo custo de implementá-la.

## Consequências (custo)
Comparado à Clean Architecture, temos menos isolamento: as entidades e services dependem do TypeORM. Mitigação: regras de negócio em funções puras e porta/adaptador na integração com o legado. Em troca, menos arquivos e menos cerimônia.