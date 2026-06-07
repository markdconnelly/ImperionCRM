# Imperion CRM — Data Model

- **Status:** Draft (decisions D1–D11 locked 2026-06-07)
- **Related:** [product-requirements](../architecture/product-requirements.md),
  ADR-0010 … ADR-0016, [data-access-layer](./data-access-layer.md)
- **Store:** PostgreSQL + `pgvector` (ADR-0003), single unified store: system of
  record, embedding store, and agent memory.

## Principles

- **Modular by bounded context.** Each module (below) owns its tables; the spine
  (Account/Contact/Opportunity) is referenced by FK, never reshaped by satellites.
- **Staged enrichment (bronze→silver→gold, CLAUDE.md §4).** Raw payloads land in
  bronze (JSONB), are normalized to silver columns, and distilled to gold
  (summaries + embeddings) for agent consumption.
- **Append-only where it's evidence.** Interactions, consent events, agent runs,
  and audit logs are immutable event logs; current state is derived.
- **External systems are referenced, not owned.** Autotask/IT Glue data is polled;
  only an identity map + short-lived cache lives here.
- **PII-aware.** PII columns are tagged; access is audit-logged (ADR-0016).
- All PKs are `uuid`; all rows carry `created_at`/`updated_at`; soft-delete via
  `archived_at` where retention requires it.

> Conventions in the diagrams: `PK` primary key, `FK` foreign key. Attribute lists
> show **key** columns only, not the full DDL (that lands with the migrations in
> Phase 1).

## Diagram 1 — CRM core, delivery, and the engagement timeline

```mermaid
erDiagram
    ACCOUNT ||--o{ CONTACT : has
    ACCOUNT ||--o{ OPPORTUNITY : "runs over time"
    ACCOUNT ||--o{ PROJECT : "delivery"
    ACCOUNT ||--o{ INTERACTION : "timeline"
    CONTACT ||--o{ INTERACTION : "participates"
    OPPORTUNITY ||--o{ PROPOSAL : has
    OPPORTUNITY ||--o| PROJECT : "won -> onboarding"
    OPPORTUNITY ||--o{ INTERACTION : "context"
    PROJECT ||--o{ MILESTONE : has
    PROJECT ||--o{ READINESS_ITEM : "checklist"
    PROJECT ||--o| HANDOFF : "completes"
    PROJECT ||--o{ TASK : "delivery work"
    OPPORTUNITY ||--o{ TASK : "sales work"
    INTERACTION ||--o| INTERACTION_EMBEDDING : "gold"

    ACCOUNT {
      uuid id PK
      text name "unique"
      text relationship "prospect|customer|partner"
      boolean is_active
      text lifecycle_stage "enum"
      numeric health_score "computed"
      uuid owner_user_id FK
      timestamptz created_at
    }
    CONTACT {
      uuid id PK
      uuid account_id FK
      text full_name
      text email
      text phone
      jsonb attribution
      boolean pii
    }
    OPPORTUNITY {
      uuid id PK
      uuid account_id FK
      text name
      text sales_stage "enum"
      numeric amount_mrr
      text source "manual|seed|autotask|quotemanager"
      text external_ref "feed id"
      uuid owner_user_id FK
      jsonb attribution
    }
    PROPOSAL {
      uuid id PK
      uuid opportunity_id FK
      text status
      text document_blob_ref
      timestamptz sent_at
      timestamptz accepted_at
    }
    PROJECT {
      uuid id PK
      uuid account_id FK
      uuid opportunity_id FK
      text type "onboarding|implementation"
      text status
    }
    MILESTONE {
      uuid id PK
      uuid project_id FK
      text name
      timestamptz due_at
      timestamptz completed_at
    }
    READINESS_ITEM {
      uuid id PK
      uuid project_id FK
      text criterion
      boolean satisfied
      uuid validated_by FK
    }
    HANDOFF {
      uuid id PK
      uuid project_id FK
      uuid to_user_id FK
      timestamptz handed_off_at
      jsonb summary
    }
    TASK {
      uuid id PK
      uuid account_id FK
      uuid owner_user_id FK
      text title
      text status
      timestamptz due_at
    }
    INTERACTION {
      uuid id PK
      uuid account_id FK
      uuid contact_id FK
      uuid opportunity_id FK
      text source "m365|plaud|sms|facebook|system"
      text channel
      text direction
      jsonb payload_bronze
      jsonb normalized_silver
      text summary_gold
      text blob_ref
      timestamptz occurred_at
    }
    INTERACTION_EMBEDDING {
      uuid id PK
      uuid interaction_id FK
      vector embedding
      text model
    }
```

## Diagram 2 — Integrations, demand generation, communications & consent

```mermaid
erDiagram
    ACCOUNT ||--o{ EXTERNAL_IDENTITY : "mapped to systems"
    INTEGRATION_CONNECTION ||--o{ EXTERNAL_IDENTITY : "scopes"
    INTEGRATION_CONNECTION ||--o{ SYNC_STATE : tracks
    CAMPAIGN ||--o{ AD : contains
    CAMPAIGN ||--o{ CAMPAIGN_METRIC : "polled"
    CAMPAIGN ||--o{ CONTACT : "attributed leads"
    CONTACT ||--o{ ENRICHMENT : "lead intel"
    CONTACT ||--o{ CONSENT_EVENT : "ledger"
    WORKFLOW ||--o{ WORKFLOW_STEP : has
    WORKFLOW ||--o{ WORKFLOW_ENROLLMENT : "enrolls contacts"
    CONTACT ||--o{ WORKFLOW_ENROLLMENT : "nurtured by"

    EXTERNAL_IDENTITY {
      uuid id PK
      text entity_type "account|contact"
      uuid entity_id
      text system "autotask|itglue|m365|facebook"
      text external_id
    }
    INTEGRATION_CONNECTION {
      uuid id PK
      text system
      text keyvault_secret_ref
      text status
    }
    SYNC_STATE {
      uuid id PK
      uuid connection_id FK
      text resource
      timestamptz last_synced_at
      text cursor
    }
    CAMPAIGN {
      uuid id PK
      text platform "facebook"
      text external_id
      text name
      numeric budget
      text status
    }
    AD {
      uuid id PK
      uuid campaign_id FK
      text external_id
      text name
    }
    CAMPAIGN_METRIC {
      uuid id PK
      uuid campaign_id FK
      date metric_date
      numeric spend
      int impressions
      int leads
    }
    ENRICHMENT {
      uuid id PK
      uuid contact_id FK
      text source
      numeric confidence
      text summary_gold
      vector embedding
      timestamptz refreshed_at
    }
    CONSENT_EVENT {
      uuid id PK
      uuid contact_id FK
      text channel "email|sms|call_recording"
      text action "opt_in|opt_out"
      text proof
      text source
      timestamptz occurred_at
    }
    WORKFLOW {
      uuid id PK
      text name
      text trigger
      boolean active
    }
    WORKFLOW_STEP {
      uuid id PK
      uuid workflow_id FK
      int ordinal
      text action
      jsonb config
    }
    WORKFLOW_ENROLLMENT {
      uuid id PK
      uuid workflow_id FK
      uuid contact_id FK
      int current_step
      text status
    }
```

## Diagram 3 — Agent platform, AI Board, feedback & identity

```mermaid
erDiagram
    AGENT ||--o{ AGENT_TOOL_GRANT : "may use"
    AGENT ||--o{ AGENT_RUN : executes
    AGENT_RUN ||--o{ AGENT_MESSAGE : "transcript"
    AGENT ||--o{ AGENT_MEMORY : remembers
    APP_USER ||--o{ AGENT_RUN : "acts as"
    BOARD_SESSION ||--o{ BOARD_SESSION_MEMBER : convenes
    AGENT ||--o{ BOARD_SESSION_MEMBER : "as persona"
    BOARD_SESSION ||--o{ BOARD_MESSAGE : "deliberation"
    BOARD_SESSION ||--o| BOARD_RECOMMENDATION : synthesizes
    APP_USER ||--o{ FEATURE_REQUEST : submits
    FEATURE_REQUEST ||--o{ FEATURE_VOTE : "upvotes"
    FEATURE_REQUEST ||--o{ FEATURE_STATUS_HISTORY : "triage"
    APP_USER ||--o{ AUDIT_LOG : "actions"

    APP_USER {
      uuid id PK
      text entra_object_id
      text email
      text display_name
      text[] roles "from Entra groups"
    }
    AGENT {
      uuid id PK
      text name
      text module "crm|board"
      text instructions
      jsonb model_routing
      text persona_role "board only"
    }
    AGENT_TOOL_GRANT {
      uuid id PK
      uuid agent_id FK
      text tool
      jsonb scope
    }
    AGENT_RUN {
      uuid id PK
      uuid agent_id FK
      uuid acting_user_id FK
      text status
      int tokens
      numeric cost_usd
      jsonb permission_scope
    }
    AGENT_MESSAGE {
      uuid id PK
      uuid run_id FK
      text role
      text content
      jsonb tool_calls
    }
    AGENT_MEMORY {
      uuid id PK
      uuid agent_id FK
      text kind "fact|summary"
      text content
      vector embedding
    }
    BOARD_SESSION {
      uuid id PK
      uuid opened_by FK
      text topic
      text status
    }
    BOARD_SESSION_MEMBER {
      uuid id PK
      uuid session_id FK
      uuid agent_id FK
    }
    BOARD_MESSAGE {
      uuid id PK
      uuid session_id FK
      uuid agent_id FK
      text content
    }
    BOARD_RECOMMENDATION {
      uuid id PK
      uuid session_id FK
      text recommendation
      jsonb rationale
    }
    FEATURE_REQUEST {
      uuid id PK
      uuid submitted_by FK
      text title
      text detail
      text status
      int priority
      text github_issue_url
      text released_in
    }
    FEATURE_VOTE {
      uuid id PK
      uuid feature_request_id FK
      uuid user_id FK
    }
    FEATURE_STATUS_HISTORY {
      uuid id PK
      uuid feature_request_id FK
      text status
      uuid changed_by FK
      timestamptz changed_at
    }
    AUDIT_LOG {
      uuid id PK
      uuid actor_user_id FK
      text action
      text entity_type
      uuid entity_id
      jsonb detail
      timestamptz occurred_at
    }
```

## Enumerations

- `account.relationship`: `prospect | customer | partner` (null = unknown)
- `account.lifecycle_stage`: `prospect | onboarding | implementation |
  operational_readiness | managed_active | dormant`
- `opportunity.sales_stage`: `lead | qualified | proposal | won | lost`
- `interaction.source`: `m365_email | m365_teams | plaud | sms | email |
  facebook | system`
- `consent_event.channel`: `email | sms | call_recording`

The dashboard's five-stage strip (Lead, Qualified, Proposal, Onboarding, Active) is
a **read view** mapping Opportunity `sales_stage` and Account `lifecycle_stage`, not
a stored field.

## Vector data (pgvector)

Embeddings live in `interaction_embedding`, `enrichment`, and `agent_memory`. Each
row records the embedding `model` so retrieval can filter by model and the corpus
can be re-embedded on model change. Retrieval is gold-only — agents query summaries
+ embeddings, never raw bronze. Chunking/retention policy: see open items in the
[requirements](../architecture/product-requirements.md).

## Build phases

The schema is designed in full now; tables are created per the phase plan in the
[requirements doc](../architecture/product-requirements.md#build-phasing-schema-designed-now-built-in-order).
Phase 1 creates the Diagram 1 spine + interactions + identity/RBAC and wires the
dashboard to real queries behind the existing repository abstraction (ADR-0007).
This ERD is updated on every schema change (CLAUDE.md §8).
