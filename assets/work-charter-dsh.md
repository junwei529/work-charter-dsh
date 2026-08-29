# Work Charter for DSH

Use this Skill when consequential DSH work needs explicit outcome, authority, recovery, writer, evidence, or independent acceptance boundaries. A Charter is policy state; it is not a DSH goal, plan, workflow, approval, subagent, Session lineage, or Trajectory.

## Activation and authority

- Mention, discovery, or loading of this Skill does not activate a Charter.
- When applicability is inferred rather than directly requested, begin `Work Charter appears applicable because ...`, propose activation plus the smallest status read, and ask for confirmation. Before confirmation, do not create a Charter, claim selected/loaded/invoked/active/adopted state, or prescribe a pause/writer/evidence/handoff/resume workflow.
- A direct user request to use Work Charter, or confirmation of that proposal, permits the Charter workflow to begin but grants no implementation or external-effect authority. Read status first; create only a proposed draft when no active Charter exists and the required contract is known.
- Activation requires an externally approved authority reference and a successful Host-side `activate` transition.
- A Charter never grants permissions. Filesystem, shell, Git, network, installation, publication, approval, and external effects remain governed by DSH and the surrounding project.
- The candidate plugin cannot approve, accept, assess, or govern itself. Preserve `UNKNOWN` where identity or authority is not independently proved.
- Start with the least sufficient protection: `current-task`, `durable-single-agent`, `planner-executor`, or `standard-ope`. More roles are not inherently safer.

## Charter contents

Keep these layers distinct:

1. Confirmed Contract — human-confirmed outcome, acceptance, scope, exclusions, and required external effects.
2. Necessary Guardrails — safety, permissions, reversibility, trust, compatibility, and authoritative project rules.
3. Working Proposal — files, functions, algorithms, commands, sequence, and other replaceable implementation choices.
4. Assumptions / Open Decisions — uncertainty that must not silently become fact.

Record one explicit current writer. An active Charter retains its eligible writer; ordinary release or handoff requires pausing first, while accepted close clears the writer atomically. Record evidence by exact subject and expected revision; a passed check for stale bytes is not current evidence. A one-shot check is consumed when attempted, including failure or interruption, and must not be silently retried or renamed.

## Operating flow

1. Read `work_charter_status` before consequential action. Treat its revision and authority revision as compare-and-set tokens.
2. If no Charter is active, use ordinary DSH/project rules unless the user has actually authorized Charter activation. Do not invent durable policy.
3. While active, act only inside the Confirmed Contract and Necessary Guardrails. You may replace a Working Proposal only when protected outcomes, risk, permissions, interfaces, evidence, and acceptance remain unchanged.
4. Stop and pause when a recorded stop condition is reached, authority becomes revoked or unknown, the writer is ambiguous, current state cannot be reopened, required evidence becomes invalid, or a material decision lacks its semantic owner. A paused Charter may record revoked or unknown authority; `resume` remains blocked until externally referenced approved authority is restored.
5. A new turn, Session, title, branch, workspace route, or agent does not erase prior attempts, evidence consumption, open decisions, or Charter state.
6. Resume only after reloading the authoritative Charter and coordination state and completing an authorized `resume` transition. Never infer resume from chat history.

## Cross-Session work

`session-coordinator-dsh` owns Workstream membership, addressed delivery, correlation, and delivery state. Work Charter owns what a Result Notice means.

- The current writer sends one checkpoint-bound Result Notice to an assigned assessment/control role.
- Do not submit a new Result Notice while any material decision remains open; resolve it or record the authorized `UNKNOWN` disposition first.
- Each route permits only one Result Notice for a checkpoint and requires the previous notice's disposition before advancing to a distinct checkpoint. After correction, preserve the rejected checkpoint and report corrected work under a new checkpoint.
- In `standard-ope`, only when the latest Executor Result Notice has received an `accepted` disposition from its assigned Planner or Assessor may the assigned Planner send the causally linked phase-level Result Notice to the Orchestrator.
- The exact recipient returns exactly one of `accepted`, `correction-required`, or `decision-required` for that checkpoint.
- Accepted close requires the latest Result Notice on every used route to be `accepted`; a later accepted checkpoint may supersede an earlier non-accepted result without erasing its history.
- Delivery `unknown` remains `UNKNOWN`; do not resend blindly. Reconcile the existing coordination record first.
- `decision-required` must reference an open decision owned by the Session that can actually decide it.
- Runtime `idle`, a message send, or an unverified self-report is not proof that a disposition arrived.

## DSH-specific evidence and recovery

The Host service is authoritative. Browser badges and dialogs are read-only presentation; direct browser Remotes cannot create or mutate a Charter and a client-supplied Session id is never mutation authority. Current Charter model context is assembled as DSH dynamic runtime context, which DSH stores as a durable user-role snapshot in the Session log. Use `work_charter_status` to reopen full current state after compaction or interruption; do not rely on an earlier prompt snapshot.

When state is uncertain, report what is proved, what did not happen, and the one material decision or recovery action needed. Never convert a storage, coordination, shell, sandbox, or dependency failure into product acceptance or a code change without evidence.
