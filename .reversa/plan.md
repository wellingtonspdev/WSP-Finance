# Plano de Exploracao - WSP-Finance

> Criado pelo Reversa em 2026-05-02
> Marque cada tarefa com [x] quando concluida.
> Voce pode editar este plano antes de iniciar: adicione, remova ou reordene tarefas conforme necessario.

---

## Fase 1: Reconhecimento

- [x] **Scout** - Mapeamento de estrutura de pastas e tecnologias
- [x] **Scout** - Analise de dependencias e gerenciadores de pacotes
- [x] **Scout** - Identificacao de entry points, CI/CD e configuracoes

## Fase 2: Escavacao

> Modulos identificados pelo Scout em `.reversa/context/surface.json`.

- [x] **Archaeologist** - Analise do modulo `auth`
- [x] **Archaeologist** - Analise do modulo `workspaces`
- [x] **Archaeologist** - Analise do modulo `rbac-rls`
- [x] **Archaeologist** - Analise do modulo `finance-core`
- [x] **Archaeologist** - Analise do modulo `uploads-storage`
- [x] **Archaeologist** - Analise do modulo `imports-open-finance`
- [x] **Archaeologist** - Analise do modulo `bank-movements`
- [x] **Archaeologist** - Analise do modulo `accountant`
- [x] **Archaeologist** - Analise do modulo `external-data`
- [x] **Archaeologist** - Analise do modulo `frontend-shell`

## Fase 3: Interpretacao

- [x] **Detetive** - Arqueologia Git e ADRs retroativos
- [x] **Detetive** - Regras de negocio implicitas e maquinas de estado
- [x] **Detetive** - Matriz de permissoes (RBAC/ACL)
- [x] **Arquiteto** - Diagramas C4 (Contexto, Containers, Componentes)
- [x] **Arquiteto** - ERD completo e integracoes externas
- [x] **Arquiteto** - Spec Impact Matrix

## Fase 4: Geracao

- [x] **Redator** - Specs SDD por componente
- [x] **Redator** - OpenAPI (se aplicavel)
- [x] **Redator** - User Stories (se aplicavel)
- [x] **Redator** - Code/Spec Matrix

## Fase 5: Revisao

- [x] **Revisor** - Revisao cruzada de specs
- [x] **Revisor** - Resolucao de lacunas com o usuario
- [x] **Revisor** - Relatorio de confianca final

---

## Agentes Independentes

> Execute estes agentes quando os recursos estiverem disponiveis - podem rodar em qualquer fase.

- [ ] **Visor** - Analise de interface via screenshots
- [ ] **Data Master** - Analise completa do banco de dados
- [ ] **Design System** - Extracao de tokens de design
- [ ] **Tracer** - Analise dinamica (requer sistema acessivel)
