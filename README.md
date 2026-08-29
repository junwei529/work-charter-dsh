# work-charter-dsh

Status: **DSH alpha.1 base runtime and L4 Standard O/P/E qualified candidate — private, unreleased, and not independently semantically accepted**

`work-charter-dsh` adapts the current local Codex Work Charter policy to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness). It is an external DSH bundle with a Host policy service and an additive browser Client. The Host owns authoritative Charter state and deterministic transition checks; [`session-coordinator-dsh`](https://github.com/junwei529/session-coordinator-dsh) supplies the Workstream, Session-addressing, correlation, delivery, and recovery capabilities that Work Charter needs but DSH does not natively provide.

The candidate currently includes:

- a strict TypeScript Charter state machine covering outcome, scope, authority, roles, one writer, evidence, decisions, stop/resume, Result Notices, dispositions, acceptance, and recovery;
- a plugin-owned DSH storage domain with schema validation and explicit incompatible/unknown failure states;
- integration with the public `session-coordinator-dsh` service contract, without importing its implementation internals;
- a DSH Skill, model tools, and bounded dynamic runtime context that can be reconstructed from the Session log;
- typed Host interfaces, a read-only Remote projection, and additive global/per-Session browser UI contributions;
- unit tests for policy, model-context, storage/transport uncertainty, and Result Notice/disposition behavior.

The implementation does not replace DSH goals, plans, workflows, approvals, Sessions, subagents, sandboxing, the agent loop, or Trajectory. A Charter never grants filesystem, shell, Git, network, installation, publication, or external-effect authority. Browser surfaces are read-only affordances, not enforcement or an identity boundary. The candidate cannot govern, approve, accept, or evaluate itself.

The current adaptation targets official DSH `dsh-v0.1.2-alpha.1` and the paired private `session-coordinator-dsh@0.1.1-alpha.1` candidate. It follows alpha.1's split Client ownership: Cordis owns the Context, API Remotes owns the generated Remote projection, UI Renderer owns slots, and UI Session supplies Session-scoped props. The removed aggregate `dsh-client-runtime` is neither imported nor declared.

The candidate now builds and packs, and a fresh task-local consumer installs only the packed Work Charter/scdp candidates plus artifacts produced from the exact clean DSH tag. Strict consumer typechecking, real Loader composition, Host enforcement, JSON restart/reopen, Session-log context recovery, scdp Result Notice/disposition flow, Client disposal/reload, and a real Chromium additive-UI smoke check pass on that exact graph.

A dedicated `standard-ope` packed-consumer run starts three distinct real DSH Orchestrator, Planner, and Executor AgentLoops. The Host permits the Planner→Orchestrator phase Result Notice only after an accepted Executor result, causally links the phase route to that execution disposition, and preserves fail-closed role and sequence checks. O→P Mandate, P→E Definition, E→P execution Result Notice, P→E execution disposition, P→O phase Result Notice, and O→P phase disposition all reach durable `acknowledged` state and are consumed by the target role models through the Work Charter/scdp path.

These results establish bounded local base-runtime and L4 Standard O/P/E behavior on the exact qualified graph, not npm installability, release readiness, broad DSH compatibility, full native-feature UI semantics, or Work Charter efficacy. The exact DSH/scdp packages remain unavailable from npm, no controlled baseline comparison or independent semantic assessment has run, and this repository intentionally provides no public installation instructions, tag, Release, or readiness claim.

## Compatibility boundary

The candidate's current claim is exact local-artifact runtime qualification with the DSH/scdp identities recorded in [the specification](docs/SPEC.md), not a version range or a public-registry installation claim. Newer DSH prereleases are not implicitly supported. Current dependency state and the next verification gate are recorded in [status](docs/STATUS.md), while commands, evidence, and limitations live in [verification](docs/VERIFICATION.md).

## License

Licensed under the [MIT License](LICENSE). The browser bundle's included
dependency notices are recorded in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Project navigation

- [Product specification](docs/SPEC.md)
- [Current status and recovery entry](docs/STATUS.md)
- [Verification method and evidence limits](docs/VERIFICATION.md)
