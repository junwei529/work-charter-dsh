# work-charter-dsh specification

Status: implementation contract for the DSH alpha.1 locally runtime- and release-qualified GitHub Pre-release candidate. Public-registry installation, public WCDP publication, semantic efficacy, and overall v1 acceptance remain open.

## Bound identities and compatibility

- `WC-UPSTREAM`: installed Codex Skill `junwei529/work-charter` version `0.3.0`, package SHA-256 `7b67ea1f7073fa66ac91c36f3e39c735b54c04174e2fa3672068f8fa8948a5b2`, normalized package tree `0ac3cbb0f1fa8fa51d8f832c8127eabc9863ec9e`.
- DSH source target: official tag `dsh-v0.1.2-alpha.1`, commit `cd5ef8148158c3a752a658978873241fdf8e2bbc`, Node `^22.19.0 || >=24.0.0`.
- Coordination dependency: private package `session-coordinator-dsh` `0.1.1-alpha.1`, public contract version `3`, logical storage schema `2`, adapted to that exact DSH alpha.1 source line and distributed as a checksumed GitHub Pre-release artifact.
- Package contract: external package id `work-charter-dsh`; its current candidate version and MIT SPDX metadata are owned by `package.json`, with the full grant in the root `LICENSE`.

Compatibility is exact and artifact-bound, not a range claim. Static/source checks establish that the candidate follows the pinned public contracts. A task-local graph made only from packed candidates and artifacts produced from the exact clean DSH tag establishes bounded clean-consumer and runtime behavior for that graph. A frozen, offline, two-producer build binds the exact DSH artifact set and published scdp artifact and establishes local release reproducibility for this WCDP candidate. The exact alpha.1 DSH packages and scdp package are not published to npm, so ordinary registry-backed installation and every other DSH version remain `BLOCKED`/`UNKNOWN` rather than inheriting the local result.

## Outcome

Provide a DSH-native policy layer that makes consequential work explicit and recoverable through Work Charter concepts: outcome, scope, authority, current writer, evidence, acceptance, stop/decision conditions, and recovery. Supply missing multi-Session continuity through the public scdp contract instead of reimplementing it.

## Product boundary

`work-charter-dsh` owns:

- Charter records, schema, lifecycle, and compare-and-set revisions;
- outcome/scope and four-layer contract declarations;
- authority, role, one-writer, evidence, decision, stop/resume, and acceptance policy;
- the policy meaning of checkpoint-bound Result Notices and dispositions;
- model-visible Charter context, DSH Skill/tool surfaces, and UI projections.

It consumes but does not own:

- scdp `WorkstreamId`, Session membership, addressing, correlation, immutable coordination records, delivery state, and delivery reconciliation;
- DSH Session persistence, dynamic runtime-context logging, tools, skills, approvals, sandbox, goals, plans, workflows, subagents, agent loop, and Trajectory;
- Git/worktree operations, native review, installation, release, or external authorization supplied by the surrounding Harness/project workflow.

A Charter never expands any of those permissions. The Host is authoritative; model instructions and browser components are policy consumers and affordances.

## Identity and assessment separation

Development and evaluation keep four identities separate:

1. `WC-GOVERNANCE`: any external Work Charter used to govern development;
2. `WC-UPSTREAM`: the immutable Codex Skill baseline above;
3. `WC-DSH-CANDIDATE`: the exact candidate source/build/install identity under test;
4. an independent assessor whenever acceptance requires semantic judgment.

The candidate cannot govern, approve, accept, or assess itself. External governance instructions must not enter baseline or candidate model context; leakage invalidates causal efficacy conclusions.

## Semantic adaptation

### Activation and protection

Skill discovery, loading, or mention is not Charter activation. For an indirect match, the Skill proposes applicability and the smallest status read, then waits for confirmation without creating policy or prescribing Charter workflow. Direct user intent or confirmation permits the workflow to begin but grants no implementation or external-effect authority. A Charter starts as `draft`; Host activation requires an externally referenced `approved` authority, an eligible assigned writer, a current Charter revision, and a current authority revision. The least sufficient protection is selected from:

- `current-task` or `durable-single-agent`: exactly one Controller; a Session target must name that Session;
- `planner-executor`: a Workstream target with distinct Planner and Executor, plus an optional Assessor independent of the Executor;
- `standard-ope`: a Workstream target with distinct Orchestrator, Planner, and Executor, plus an optional Assessor independent of the Executor.

### Contract layers

The durable contract keeps these separate:

1. Confirmed Contract — externally confirmed outcome, acceptance, scope, exclusions, and required effects;
2. Necessary Guardrails — permissions, safety, reversibility, trust, compatibility, and authoritative project rules;
3. Working Proposal — replaceable files, functions, algorithms, commands, and sequence;
4. Assumptions / Open Decisions — uncertainty that cannot silently become fact.

### Lifecycle and fail-closed rules

The normal lifecycle is `draft -> active -> paused -> active -> closed`. An active Charter always retains one eligible writer. Ordinary writer release or handoff requires `draft` or `paused`; accepted close clears the active writer atomically with the terminal transition. A paused Charter may persist revoked or unknown authority so the loss of authority is durable, while `resume` remains fail-closed until externally referenced approved authority is restored. `closed` is terminal for transitions, Result Notices, and dispositions. Before every Workstream-target transition, the Host reopens the Workstream and revalidates the acting Session's current scdp membership; membership lookup failure fails closed, while activation and resume additionally revalidate every assigned role. New Result Notice and disposition transport likewise revalidates both Workstream endpoints before any transport or Charter write. Host operations reject stale Charter or authority revisions, ineligible/ambiguous writers, unauthorized or detached roles, revoked or unknown authority for active work, open material decisions, invalid evidence replacement, and invalid terminal acceptance.

One-shot evidence is consumed when recorded, including a failed or unknown result, and its entire consumed record cannot be replayed, altered, or removed by contract revision; pending evidence cannot carry consumption metadata. Accepted close is valid only from `active` and requires approved authority, an independent eligible acceptance actor, one current eligible writer that the terminal transition releases atomically, no open decisions, all required evidence passed, and no Result Notice awaiting a disposition. Missing or conflicting identity, storage, coordination, delivery, or recovery proof remains `UNKNOWN`.

### Cross-Session result flow

The current writer may submit one checkpoint-bound Result Notice to an eligible Planner, Assessor, Controller, or Orchestrator only while no material decision remains open. A route permits only one notice for a given checkpoint and cannot advance to a distinct checkpoint while its latest notice still awaits disposition. A corrected result uses a new checkpoint while preserving the prior outcome; accepted close requires the latest notice on every used route to have an `accepted` disposition. For `standard-ope`, the assigned Planner may additionally submit the phase-level Result Notice to the assigned Orchestrator only when the latest Executor Result Notice has received an `accepted` disposition from its exact Planner or Assessor recipient. The Host causally binds that phase notice to the accepted execution disposition, asks scdp to accept the immutable addressed coordination record, and records the exact correlation, record identity, and observed delivery state. The exact recipient may return one causally linked disposition: `accepted`, `correction-required`, or `decision-required`.

An unknown scdp accept is reopened using the same record identity. A matching immutable record may be recovered; a conflicting record fails explicitly, and a read failure preserves delivery as `UNKNOWN`. The plugin never blindly substitutes a new notice identity.

## DSH surfaces

### Host service and storage

The Cordis service key and Typert Remote namespace are `workCharter`. The public same-process Host service supports health, create/get/list, Session list, transition, Result Notice submission, and disposition return. The browser Remote is intentionally read-only: it exposes health, get/list, and Session-list operations with JSON-compatible runtime validation, but no create, transition, Result Notice, or disposition mutation. DSH alpha.1 does not supply a trusted caller identity on that direct Remote boundary, so a client-provided Session id is never treated as mutation authority. Model tools derive their actor from the executing DSH Agent Session; other Host callers remain inside the same-process trust boundary and must supply the exact actor identity.

Authoritative state uses storage domain `work_charter_dsh`, table `charters`, physical schema `1`, logical schema `1`. Reopen validates domain metadata, row identifiers, and every durable invariant; incompatible state fails as `SCHEMA_INCOMPATIBLE` rather than being silently migrated.

### Skill, tools, and logged model context

The bundle registers the DSH Skill `work-charter` and these model tools:

- `work_charter_status`;
- `work_charter_create_draft`;
- `work_charter_transition`;
- `work_charter_result_notice`;
- `work_charter_disposition`.

The draft tool cannot approve or activate authority. Active/paused Charter context is bounded and assembled through DSH dynamic runtime context. The snapshot includes identities, revisions, authority, roles/writer, the four contract layers, evidence, open decisions, awaiting notices, pause state, and the no-permission disclaimer. The exact local runtime fixture proves that DSH persists active and paused snapshots plus the inactive clear marker in the Session log, and that a restarted Agent recovers that history without a redundant snapshot. If scdp state cannot be read, the snapshot and status tool say coordination is `UNKNOWN` rather than clearing policy context or claiming that no Charter exists.

### Browser Client

The lazy-CJS browser half contributes one fresh id, `work-charter-dsh`, to additive seats:

- `sidebar.footer.action` for the global entry;
- `conversation.session.header.actions` for a per-Session badge;
- `shell.overlay` for read-only list/detail inspection.

The Client does not occupy or shadow goal, plan, workflow, approval/question composer, subagent lineage, Conversation root, or Trajectory owners. UI state is not authoritative and cannot grant permissions. All Charter mutations use Host-side surfaces with an established actor identity; the Client never submits an actor Session id.

For the alpha.1 split Client architecture, the bundle consumes only the public ownership faces needed by those seats: `@deepseek-ai/cordis` for `Context`, `@deepseek-ai/dsh-api-remotes/client` for the Remote projection, `@deepseek-ai/dsh-client-ui-renderer/client` for `SlotRegistry`, `@deepseek-ai/dsh-client-ui-session/client` for Session-scoped standard props, and the Conversation/Layout/Sidebar Client declarations for their respective SlotMap entries. It does not recreate an aggregate Client runtime.

## Packaging and runtime alignment

- Strict TypeScript/TSX production sources target ES2024; the Host emits Node ESM.
- `./client` is DSH's lazy-CJS closure-factory artifact inside an ESM package, not a general CommonJS surface.
- the private scdp candidate, Cordis, consumed DSH Service Definitions, and React are exact peer plus development dependencies so the containing profile supplies one runtime identity;
- Zod validates durable, wire, model/tool, and user-controlled inputs.
- the browser artifact bundles Zod, so the package includes its exact installed-version MIT notice in `THIRD_PARTY_NOTICES.md`; peer dependencies are not represented as bundled payload.
- The bundle consumes only scdp's public package/Service Definition and does not import or modify implementation internals.
- Type generation uses DSH Typert; generated Remote object codecs are hardened to strict objects.

## Non-goals for v1

- Reimplementing scdp transport, Workstream identity, membership, or its coordination ledger.
- Replacing DSH goal, plan, workflow, approval, subagent, Session, sandbox, agent loop, or Trajectory capabilities.
- Claiming compatibility with unqualified DSH versions or broad parity with every Harness.
- Candidate self-governance, self-acceptance, or self-assessment.
- Treating documentation, typechecks, unit tests, or model self-report as runtime or semantic-efficacy evidence.

## Acceptance contract

v1 is acceptable only when evidence shows that:

- the external bundle installs and loads with the exact pinned DSH and scdp identities;
- Host ESM, declarations, Remote artifacts, and lazy-CJS Client format resolve from a clean consumer;
- a Charter can be created, attached, persisted, restarted, reopened, and recovered for a Workstream and Session;
- stale/unauthorized transitions fail closed at the Host while authorized transitions remain usable;
- scdp Result Notice/disposition delivery, unknown-state recovery, and conflict handling work through the public service;
- model-visible Charter context is reconstructable from the DSH Session log and absent when not active;
- Work Charter UI coexists with native goal, plan, workflow, approval, Conversation, and Trajectory UI;
- deterministic unit, integration, restart, keyless snapshot, and browser checks pass;
- identities and governance isolation are recorded; and
- any semantic efficacy claim comes from a controlled comparison and independent assessment, not candidate self-report.

## Current acceptance disposition

The exact final local-artifact graph satisfies the package/type, two-producer release reproducibility, clean-consumer, Loader, Host enforcement, JSON restart/reopen, base scdp coordination, logged-context, bounded Chromium, and Standard O/P/E L4 acceptance layers recorded in `docs/VERIFICATION.md`. The dedicated L4 run uses three distinct real DSH role AgentLoops and the Work Charter/scdp path for all six messages. The Host rejects a premature Planner phase report, permits it only after an accepted Executor result, causally links P→O to the execution disposition and O→P to the phase notice, and emits distinct phase-level message schemas. All six deliveries reach durable `acknowledged` state and are consumed by their target role models.

Overall v1 acceptance also remains open because no controlled upstream-baseline/candidate comparison or independent semantic assessment has run. The current browser evidence proves additive seat ownership and Work Charter behavior in real Chromium; native goal/plan/workflow/approval/Conversation/Trajectory entries are ownership sentinels in the qualification fixture, not full semantic end-to-end tests of those native features.
