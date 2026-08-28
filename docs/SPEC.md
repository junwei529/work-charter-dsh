# work-charter-dsh specification

Status: initial working contract. The exact upstream Work Charter baseline, package scope, DSH compatibility range, and scdp dependency range remain unbound.

## Outcome

Provide a DSH-native policy layer that makes consequential multi-Session work explicit and recoverable through Work Charter concepts: outcome, scope, authority, writer, evidence, acceptance, stop/decision conditions, and recovery.

## Product boundary

`work-charter-dsh` owns:

- Charter records and their lifecycle;
- outcome/scope and authority declarations;
- writer/role policy and transition checks;
- evidence requirements, acceptance state, unresolved decisions, stop state, and recovery guidance;
- model-visible Charter context and its DSH-log representation;
- Work Charter UI and policy-specific projections.

It consumes but does not own:

- `WorkstreamId`, Session membership, coordination addressing, correlation, transport state, and generic failure recovery, which belong to `session-coordinator-dsh`;
- DSH Session persistence, agent loop, tools, approvals, sandbox, subagents, workflow, goal, plan, and Trajectory;
- Git/worktree operations, native review, installation, release, or external authorization supplied by the surrounding Harness/project workflow.

## Identity separation

Evaluation must bind and keep separate:

1. `WC-GOVERNANCE`: the stable external Work Charter process, if used to govern development;
2. `WC-UPSTREAM`: the exact stable Work Charter source/version/hash used as the product baseline;
3. `WC-DSH-CANDIDATE`: the exact candidate plugin source/build/install identity;
4. an independent assessor when acceptance requires semantic judgment.

The candidate cannot govern, approve, accept, or evaluate itself. Governance instructions must not enter baseline/candidate model context; such leakage invalidates causal product conclusions.

## Required v1 capabilities

1. Create and attach a Charter to a scdp Workstream or an individual DSH Session.
2. Record outcome, bounded scope, authority, current writer/role, evidence requirements, acceptance owner/state, stop conditions, unresolved decisions, and recovery entry.
3. Apply deterministic Host-side validation to policy state transitions and reject stale or unauthorized updates explicitly.
4. Provide a typed service and JSON-compatible Remote DTOs without importing scdp implementation internals.
5. Project the current Charter into the relevant Session UI and global Workstream UI with plugin-owned keys.
6. Assemble model-visible Charter instructions through a DSH-supported logged path so the request can be reconstructed from Session history.
7. Preserve `UNKNOWN` when identity, authority, delivery, evidence, or current state cannot be proved.
8. Support recovery by reloading the authoritative Charter and coordination state rather than relying on chat history.

## DSH integration design

### Host

- Depend on the scdp Service Definition through Cordis injection; the compatible version range will be pinned after scdp's first public contract exists.
- Store authoritative Charter state in a plugin-owned domain and connect it to Workstreams through `WorkstreamId`.
- Enforce state transitions at Host request/command entry points.
- Use DSH system-prompt/skill/injection seams only when the resulting model-visible input is logged and replayable.
- Use plugin-owned event/projection namespaces such as `work-charter/*` and `workCharter` only after the external event compatibility path is proven.

### Client

- Use fresh ids such as `work-charter-dsh` for all contributions.
- Prefer additive `conversation.session.header.actions`, `conversation.input.dock`, or a scdp-provided extension point.
- Do not occupy or shadow DSH `goal`, `plan`, `workflow-run`, approval/question composer, subagent lineage, or Trajectory owners.
- A browser input block may explain a stop state but is never the authoritative enforcement mechanism.

## Implementation language and runtime alignment

The DSH Loader can execute plain JavaScript ESM, so TypeScript is not a universal Loader requirement. For `work-charter-dsh`, TypeScript is a project requirement because the plugin implements a typed policy state machine, consumes the scdp Service Definition, exports durable/Remote DTOs and declarations, and contributes browser UI.

### Must align with the pinned DSH release

- TypeScript production sources compile to JavaScript; the Host entry is Node ESM under a package with `"type": "module"`.
- The Node engine range is `UNKNOWN` and must be bound only after an exact supported DSH release and its package/runtime contract are evidenced.
- Host exports include built JavaScript and declaration files, provisionally `lib/index.js` and `lib/types/index.d.ts`.
- The browser half is exported as `./client`, declared in `dsh.client`, and built as DSH's lazy-CJS closure-factory artifact. This artifact is a Loader format inside an ESM package, not a public CommonJS API.
- scdp, required DSH Service Definitions, `@deepseek-ai/cordis`, and the shared UI runtime such as React are peer dependencies and development dependencies so one profile supplies one service/runtime identity.
- Host/Client wire values are JSON-compatible, and the browser half does not value-import scdp or another plugin's implementation; cross-plugin collaboration uses Cordis services and type-only imports.
- Durable, wire, model/tool, and user-controlled inputs receive runtime validation; same-process typed internals rely on TypeScript.

### Project defaults

- Use `.ts` for Host code, React `.tsx` for Client UI, `strict`, `noImplicitAny`, declaration output, ES2024-compatible output, and explicit Host/Client build faces.
- Pin a reproducible pnpm/toolchain version after the packaging spike; matching DSH's current pnpm/tsdown versions is preferred initially but is not a public runtime guarantee.
- Reproduce and test the lazy-CJS Client output locally because DSH's internal `clientBundle` tsdown preset is not currently published for external reuse.
- tsdown is preferred for the first spike but is not mandatory; another bundler is acceptable only if byte-level/module-loading checks prove the same factory protocol and purity rules.

### Not required

- The repository need not copy DSH's full monorepo layout, every gate, or every internal project reference.
- Python is not a v1 plugin implementation language. A future isolated Python process would require an explicit process/wire contract and is outside this specification.
- Plain JavaScript may be used for a disposable loader probe, but it cannot become the released policy implementation without an authorized contract change.

## Packaging and dependency direction

- One independently versioned external bundle contains both Host and Client halves.
- Prefer publishing prebuilt npm or tarball artifacts. A Git-source installation requires a self-contained `prepare` build and explicit pnpm `allowBuilds` permission, so it is a development path rather than the default release experience.
- The eventual npm package name and scope are `UNKNOWN`; a likely convention is `@your-scope/dsh-work-charter`.
- Declare a compatible scdp version as a peer dependency once its public contract stabilizes.
- Cross-plugin integration tests and compatibility pins belong to this consuming project.
- Dependency direction remains `work-charter-dsh -> session-coordinator-dsh -> DSH`.

## Non-goals for v1

- Reimplementing scdp transport, Workstream identity, or generic coordination ledger.
- Replacing DSH goal, plan, workflow, approval, subagent, Session, sandbox, or agent-loop capabilities.
- Claiming full parity with every Codex-specific Work Charter workflow before an explicit semantic mapping and controlled evaluation.
- Candidate self-governance, self-acceptance, or self-assessment.
- Treating documentation completeness, static checks, or model self-report as efficacy evidence.

## Acceptance contract

v1 is acceptable only when evidence shows that:

- the external bundle loads with exact pinned DSH and scdp versions;
- a Charter can be created, attached, persisted, reloaded, and recovered for a Workstream and Session;
- stale/unauthorized transitions fail closed at the Host while authorized transitions remain usable;
- model-visible Charter context is reconstructable from the DSH Session log;
- Work Charter UI coexists with native goal, plan, workflow, approval, Conversation, and Trajectory UI;
- deterministic unit, integration, restart, keyless snapshot, and browser checks pass;
- baseline/candidate identities and governance isolation are recorded;
- any semantic efficacy claim comes from a controlled comparison and independent assessment, not candidate self-report.
