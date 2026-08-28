# work-charter-dsh

Status: **Planned — not yet developed**

This public repository is a minimal placeholder and navigation/status surface for a planned external plugin that would adapt Work Charter policy semantics to [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

No implementation, package, build, automated test result, compatibility proof, installable artifact, tag, or Release exists. This repository makes no claim of runtime readiness or efficacy and provides no installation instructions.

If developed, the plugin would manage outcome, scope, authority, writer, evidence, acceptance, stop, decision, and recovery policy while relying on `session-coordinator-dsh` for Workstream identity and cross-Session coordination transport/state. It would not replace DSH Sessions, the agent loop, subagents, workflow, goal, plan, approval, sandbox, or Trajectory.

The project is independently governed from `session-coordinator-dsh`, the Codex Work Charter Skill, the DSH upstream checkout, and any consumer profile. A future candidate implementation cannot govern, approve, accept, or evaluate itself.

## Dependency and compatibility status

- The public `session-coordinator-dsh` Service Definition and compatible version range are not yet bound.
- The exact upstream Work Charter source/version/hash is `UNKNOWN`.
- The exact supported DSH version range is `UNKNOWN`.

## License status

No license has been selected and no `LICENSE` file is published.

## Project navigation

- [Product specification](docs/SPEC.md)
- [Current status and recovery entry](docs/STATUS.md)
- [Verification method and evidence limits](docs/VERIFICATION.md)
