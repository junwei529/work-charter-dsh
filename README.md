# Work Charter for DeepSeek Harness

[简体中文](README.zh-CN.md)

`work-charter-dsh`—the Work Charter DSH Plugin (WCDP)—brings
[Work Charter](https://github.com/junwei529/work-charter) to
[DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness).

Work Charter is a lightweight governance layer for consequential agent work.
It turns an open-ended request into an explicit, recoverable contract: what
outcome is intended, what authority exists, who may write, what evidence is
required, which decisions remain open, when work must stop, and what must be
revalidated before it resumes.

WCDP keeps that policy model and adapts its integration to DSH. It is not a
different charter system and does not assume that users already know the Codex
Skill. The main difference is the Harness surface: the Codex edition is a
Codex Skill, while WCDP is an external DSH bundle with Host-owned policy state,
DSH model tools and runtime context, and an additive read-only browser Client.

> **Status:** public GitHub Pre-release
> [`v0.1.0-alpha.1`](https://github.com/junwei529/work-charter-dsh/releases/tag/v0.1.0-alpha.1),
> qualified only on the exact DSH/SCDP graph documented below. The source is
> public, but the package remains `private: true` and is not published to npm.

## What a Work Charter does

A Charter keeps the contract smaller than the work it protects. Routine work
does not need one. For consequential, interrupted, multi-Session, or
authority-sensitive work, a Charter makes these responsibilities explicit:

- **Outcome and boundaries** — the intended result, non-goals, and protected
  scope;
- **Authority** — what has actually been approved, at which revision, without
  converting discussion into permission;
- **Roles and writer ownership** — who is coordinating, implementing, or
  assessing, with one active writer;
- **Evidence and acceptance** — what was tested or observed, what remains
  `UNKNOWN`, and who may accept the result;
- **Decisions and recovery** — what blocks progress, when to pause, how to
  resume safely, and how to recover after interruption or drift.

The contract separates four kinds of information so implementation details do
not silently become permanent requirements:

1. **Confirmed Contract** — user-confirmed outcomes, acceptance, and
   exclusions;
2. **Necessary Guardrails** — permissions, safety, reversibility, trust, and
   compatibility boundaries;
3. **Working Proposal** — replaceable tools, files, algorithms, and execution
   steps;
4. **Assumptions / Open Decisions** — uncertainty that must not be promoted to
   fact without a decision.

Work Charter supports progressively stronger coordination rather than forcing
every task into a large workflow:

- `L0`: ordinary work with no active Charter;
- `L1` / `current-task`: one bounded Charter in the current task;
- `L2` / `durable-single-agent`: one agent plus a durable recovery anchor;
- `L3` / `planner-executor`: separate planning or assessment from the sole
  writer;
- `L4` / `standard-ope`: Orchestrator, Planner, and Executor responsibilities
  for governed multi-phase work.

A higher level adds coordination and recovery protection, not action
authority. A Charter never grants filesystem, shell, Git, network,
installation, publication, or other external-effect permission.

## Same policy, different Harness

WCDP is bound to the independently versioned Codex Work Charter `v0.3.0`
baseline. It preserves the core policy concepts while using DSH-native
extension points:

| Concern | Codex Work Charter | Work Charter for DSH |
|---|---|---|
| Delivery | Codex Skill | External DSH bundle |
| Policy behavior | Advisory guidance within Codex | Host-owned state and deterministic Charter transition checks |
| Model surface | Skill instructions in the Codex task | DSH Skill, model tools, and bounded dynamic runtime context |
| Durable context | Task plus an approved project carrier when needed | Host storage and model-visible snapshots reconstructable from the DSH Session log |
| User interface | Codex conversation workflow | Additive global/per-Session actions and a read-only browser overlay |
| Multi-Session coordination | Uses the surrounding Codex task/project workflow | Uses `session-coordinator-dsh` as a required coordination substrate |

WCDP does not replace DSH goals, plans, workflows, approvals, Sessions,
subagents, sandboxing, the agent loop, or Trajectory. The Host is authoritative
only for Charter policy state and transition validity. Browser components are
presentation and navigation affordances, not enforcement or an identity
boundary.

## Why WCDP requires session-coordinator-dsh

Work Charter policy and cross-Session coordination are separate
responsibilities. The targeted DSH version supplies Sessions and persistence,
but it does not expose the complete Workstream-level addressing, correlation,
delivery, disposition, and recovery contract that WCDP needs. That missing
coordination layer is provided by
[`session-coordinator-dsh` (SCDP)](https://github.com/junwei529/session-coordinator-dsh).

```text
Work Charter policy semantics
            |
            v
work-charter-dsh (WCDP)
  Charter state, authority, roles, writer, evidence,
  decisions, transitions, acceptance, and recovery policy
            |
            v
session-coordinator-dsh (SCDP)
  Workstream identity, Session membership and addressing,
  immutable coordination records, delivery, and reconciliation
            |
            v
DeepSeek Harness
  Sessions, storage, tools, skills, approvals, UI, and agent runtime
```

WCDP consumes only SCDP's public service contract. It does not import or
modify SCDP implementation internals, and it does not reimplement SCDP's
transport or coordination ledger. SCDP likewise does not decide Charter
policy: WCDP determines whether a Result Notice or disposition is valid for
the active Charter; SCDP addresses, records, delivers, and reconciles that
message.

SCDP is therefore a required runtime dependency, not an optional integration.
The packaged DSH profile patch mounts SCDP before WCDP so the coordination
service exists before the policy service activates. Missing or uncertain
coordination state fails closed instead of being treated as permission to
continue.

## DSH surfaces

The alpha bundle provides:

- a strict TypeScript Host state machine and plugin-owned storage domain;
- compare-and-set Charter and authority revisions with fail-closed role,
  writer, evidence, decision, Result Notice, disposition, and close checks;
- the DSH Skill `work-charter` and five model tools for status, draft creation,
  transition, Result Notice submission, and disposition return;
- bounded active/paused Charter context persisted through the DSH Session log;
- typed same-process Host interfaces and a deliberately read-only browser
  Remote;
- additive global and per-Session UI actions plus a read-only Charter overlay.

The candidate cannot govern, approve, accept, or evaluate itself. Independent
assessment remains independent even when WCDP enforces the mechanics of role
and transition separation.

## Exact qualified release graph

The current compatibility claim is exact and artifact-bound:

- `work-charter-dsh@0.1.0-alpha.1`;
- [`session-coordinator-dsh@0.1.1-alpha.1`](https://github.com/junwei529/session-coordinator-dsh/releases/tag/v0.1.1-alpha.1),
  public contract `3`, logical schema `2`;
- official DSH `dsh-v0.1.2-alpha.1`, commit
  `cd5ef8148158c3a752a658978873241fdf8e2bbc`.

No DSH version range is implied. Later prereleases, registry-backed
installation, other storage providers, multi-process or cross-host operation,
and production support remain unqualified.

## Install from the GitHub Pre-release artifacts

Neither WCDP nor its exact SCDP dependency is published to npm. Download and
checksum-verify these two GitHub Pre-release assets:

- `session-coordinator-dsh-0.1.1-alpha.1.tgz`;
- `work-charter-dsh-0.1.0-alpha.1.tgz`.

Add both tarballs to the same profile of an exact `dsh-v0.1.2-alpha.1`
installation. Run from the directory containing both files and replace
`<profile>` with an existing profile such as `web` or `headless`:

```powershell
dsh plugin --profile <profile> add .\session-coordinator-dsh-0.1.1-alpha.1.tgz .\work-charter-dsh-0.1.0-alpha.1.tgz
dsh --profile <profile> --dump-default-config
```

SCDP intentionally installs as a plain profile dependency and may emit an
orientation warning because it declares no `dsh.bundle`; WCDP is the bundle
layer. The configuration dump should show SCDP mounted before WCDP. Do not use
an npm or Git-checkout substitution for this qualified alpha graph.

## What has—and has not—been verified

On the exact graph above, frozen/offline producers created reproducible release
artifacts, a fresh consumer passed strict typechecking and real Loader/runtime
tests, and a real Chromium smoke test exercised the additive UI. A dedicated
packed-consumer `standard-ope` run started distinct DSH Orchestrator, Planner,
and Executor AgentLoops and carried the complete O→P→E result/disposition chain
through WCDP and SCDP with durable acknowledged delivery.

This establishes bounded base-runtime and L4 mechanism behavior for the exact
alpha graph. It does **not** establish broad DSH compatibility,
natural-language model quality, causal improvement in project outcomes, full
native-feature UI semantics, npm installability, or general Work Charter
efficacy. No controlled baseline comparison or independent semantic-efficacy
assessment has been run.

The qualified `work-charter-dsh-0.1.0-alpha.1.tgz` bytes are a
checksum-bound packaging-time snapshot. Its bundled 52-line README predates
publication and still says that the tag and GitHub Release do not yet exist.
This repository documentation update does not replace, alter, or re-sign the
98,593-byte artifact that was published and verified. Use its published
checksum—not the asset name or URL alone—to identify those qualified bytes,
and use the repository README for current release status.

## License and project navigation

Licensed under the [MIT License](LICENSE). The browser bundle's included
dependency notices are recorded in
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

- [Product specification](docs/SPEC.md)
- [Current status and recovery entry](docs/STATUS.md)
- [Verification method, evidence, and limitations](docs/VERIFICATION.md)
