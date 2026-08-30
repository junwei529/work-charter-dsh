# 面向 DeepSeek Harness 的 Work Charter

[English](README.md)

`work-charter-dsh`，即 Work Charter DSH Plugin（WCDP），把
[Work Charter](https://github.com/junwei529/work-charter) 带到
[DeepSeek Harness（DSH）](https://github.com/deepseek-ai/deepseek-harness)。

Work Charter 是一层用于关键 Agent 工作的轻量治理机制。它把开放式请求转化为一份
明确且可恢复的工作合同：目标是什么、当前有哪些授权、谁可以写入、需要什么证据、
还有哪些决定未解决、何时必须停止，以及恢复前必须重新确认什么。

WCDP 保留这套策略模型，只把集成方式适配到 DSH。它不是另一套 Charter，也不要求
用户预先了解 Codex Skill。两者主要区别在 Harness 表面：Codex 版以 Codex Skill
交付；WCDP 则是一个外部 DSH bundle，使用 Host 管理权威策略状态，并提供 DSH
模型工具、运行时上下文和增量式只读浏览器 Client。

> **状态：**已公开发布 GitHub Pre-release
> [`v0.1.0-alpha.1`](https://github.com/junwei529/work-charter-dsh/releases/tag/v0.1.0-alpha.1)；
> 目前只对下文记录的精确 DSH/SCDP 组合完成了验证。源码公开，但 package 仍为
> `private: true`，未发布到 npm。

## Work Charter 做什么

Charter 应该比它保护的工作更小。普通任务不需要 Charter；对于关键、易中断、
跨 Session 或授权敏感的工作，Charter 会明确以下责任：

- **目标与边界**——预期结果、非目标和受保护的范围；
- **授权**——实际获批的事项及其 revision，避免把讨论误当成权限；
- **角色与写入权**——谁负责协调、实施或评估，并保持一个 active writer；
- **证据与验收**——已经测试或观察到什么、哪些事实仍为 `UNKNOWN`，以及谁有权
  接受结果；
- **决策与恢复**——什么会阻断工作、何时暂停、如何安全恢复，以及发生中断或
  drift 后怎样重新进入。

为避免实施细节悄悄固化成永久要求，合同把信息分为四层：

1. **Confirmed Contract**——用户确认的目标、验收和排除项；
2. **Necessary Guardrails**——权限、安全、可逆性、信任和兼容性边界；
3. **Working Proposal**——可替换的工具、文件、算法和执行步骤；
4. **Assumptions / Open Decisions**——不能在未经决定时升级为事实的不确定性。

Work Charter 按需增强协调，而不是强迫每个任务使用大型流程：

- `L0`：没有 active Charter 的普通工作；
- `L1` / `current-task`：当前任务中的一份有界 Charter；
- `L2` / `durable-single-agent`：单 Agent 加一个持久恢复锚点；
- `L3` / `planner-executor`：把规划或评估与唯一 writer 分离；
- `L4` / `standard-ope`：为受治理的多阶段工作引入 Orchestrator、Planner 和
  Executor 职责。

更高等级增加的是协调与恢复保护，而不是行动权限。Charter 永远不会授予文件系统、
shell、Git、网络、安装、发布或其他外部效果权限。

## 同一套策略，不同的 Harness

WCDP 绑定独立版本化的 Codex Work Charter `v0.3.0` 基线。核心策略概念保持不变，
但使用 DSH 原生扩展点实现：

| 关注点 | Codex Work Charter | 面向 DSH 的 Work Charter |
|---|---|---|
| 交付形态 | Codex Skill | 外部 DSH bundle |
| 策略行为 | Codex 内的 advisory guidance | Host 管理状态并确定性校验 Charter transition |
| 模型表面 | Codex task 中的 Skill instructions | DSH Skill、模型工具和有界动态运行时上下文 |
| 持久上下文 | task，以及必要时获批的项目 carrier | Host storage，以及可从 DSH Session log 重建的模型可见 snapshot |
| 用户界面 | Codex 对话工作流 | 增量式全局/Session action 与只读浏览器 overlay |
| 跨 Session 协调 | 使用周边 Codex task/project workflow | 把 `session-coordinator-dsh` 作为必需的协调底座 |

WCDP 不替代 DSH 的 goal、plan、workflow、approval、Session、subagent、sandbox、
agent loop 或 Trajectory。Host 的权威范围仅限 Charter 策略状态和 transition
有效性；浏览器组件只负责展示和导航，不是 enforcement 或 identity boundary。

## 为什么 WCDP 必须依赖 session-coordinator-dsh

Work Charter 策略与跨 Session 协调是两种不同职责。目标 DSH 版本提供 Session 和
持久化能力，但没有直接提供 WCDP 所需的完整 Workstream 级 addressing、
correlation、delivery、disposition 和 recovery 合同。这层缺失的协调能力由
[`session-coordinator-dsh`（SCDP）](https://github.com/junwei529/session-coordinator-dsh)
提供。

```text
Work Charter 策略语义
            |
            v
work-charter-dsh（WCDP）
  Charter 状态、授权、角色、writer、证据、
  决策、transition、验收与恢复策略
            |
            v
session-coordinator-dsh（SCDP）
  Workstream 身份、Session membership/addressing、
  不可变协调记录、delivery 与 reconciliation
            |
            v
DeepSeek Harness
  Session、storage、tool、skill、approval、UI 与 Agent runtime
```

WCDP 只消费 SCDP 的公开服务合同，不导入或修改 SCDP 的实现内部，也不重新实现
SCDP 的 transport 或 coordination ledger。SCDP 同样不决定 Charter 策略：
WCDP 判断某个 Result Notice 或 disposition 对当前 Charter 是否有效；SCDP 负责
寻址、记录、投递和协调恢复。

因此，SCDP 是必需的运行时依赖，而不是可选集成。打包的 DSH profile patch 会先挂载
SCDP，再挂载 WCDP，确保 policy service 激活前 coordination service 已存在。协调
状态缺失或不确定时会 fail closed，而不会被当作继续工作的许可。

## DSH 表面

当前 alpha bundle 提供：

- 严格的 TypeScript Host 状态机和插件自有 storage domain；
- 基于 compare-and-set 的 Charter/authority revision，以及对角色、writer、
  证据、决策、Result Notice、disposition 和 close 的 fail-closed 校验；
- DSH Skill `work-charter`，以及用于 status、创建 draft、transition、提交
  Result Notice 和返回 disposition 的五个模型工具；
- 通过 DSH Session log 持久化的有界 active/paused Charter 上下文；
- 类型化的同进程 Host interface，以及刻意保持只读的 browser Remote；
- 增量式全局/Session UI action 和只读 Charter overlay。

候选不能治理、批准、验收或评估自己。即使 WCDP 能强制角色和 transition 分离的
机制，独立评估仍必须保持独立。

## 精确验证过的发布组合

当前兼容性声明只针对以下精确 artifact 组合：

- `work-charter-dsh@0.1.0-alpha.1`；
- [`session-coordinator-dsh@0.1.1-alpha.1`](https://github.com/junwei529/session-coordinator-dsh/releases/tag/v0.1.1-alpha.1)，
  public contract `3`、logical schema `2`；
- 官方 DSH `dsh-v0.1.2-alpha.1`，commit
  `cd5ef8148158c3a752a658978873241fdf8e2bbc`。

这里不隐含任何 DSH version range。后续 prerelease、registry-backed 安装、其他
storage provider、多进程或跨主机运行以及生产支持均未完成资格验证。

## 从 GitHub Pre-release artifact 安装

WCDP 及其精确 SCDP 依赖都没有发布到 npm。请下载并校验以下两个 GitHub
Pre-release artifact：

- `session-coordinator-dsh-0.1.1-alpha.1.tgz`；
- `work-charter-dsh-0.1.0-alpha.1.tgz`。

将两个 tarball 加入同一个精确 `dsh-v0.1.2-alpha.1` 安装的 profile。在包含两个
文件的目录执行下列命令，并把 `<profile>` 替换成已有 profile，例如 `web` 或
`headless`：

```powershell
dsh plugin --profile <profile> add .\session-coordinator-dsh-0.1.1-alpha.1.tgz .\work-charter-dsh-0.1.0-alpha.1.tgz
dsh --profile <profile> --dump-default-config
```

SCDP 有意作为普通 profile dependency 安装，因为它不声明 `dsh.bundle`，DSH
可能输出相应的定位提示；WCDP 才是 bundle layer。配置 dump 应显示 SCDP 先于
WCDP 挂载。不要用 npm 包或 Git checkout 替换这个已验证 alpha 组合中的 artifact。

## 已验证与尚未验证的范围

在上述精确组合上，两个 frozen/offline producer 生成了可复现发布 artifact；全新
consumer 通过严格 typecheck 和真实 Loader/runtime 测试；真实 Chromium smoke test
验证了增量式 UI。专用的 packed-consumer `standard-ope` 测试启动了相互独立的 DSH
Orchestrator、Planner 和 Executor AgentLoop，并通过 WCDP 与 SCDP 完成了完整的
O→P→E result/disposition 链路和持久 `acknowledged` 投递。

这些结果只证明精确 alpha 组合上的有界 base-runtime 与 L4 机制行为，**不证明**
广泛 DSH 兼容性、自然语言模型质量、对项目结果的因果改善、完整原生功能 UI 语义、
npm 可安装性或一般性的 Work Charter 效能。目前没有完成受控 baseline 对比或独立的
语义效能评估。

通过校验的 `work-charter-dsh-0.1.0-alpha.1.tgz` 字节是一份由 checksum 限定的打包时
快照。它内嵌的 52 行 README 生成于发布之前，因此仍写着 tag 和 GitHub Release 尚不
存在。本次仓库文档更新不会替换、修改或重新签署已经发布并验证的 98,593-byte
artifact。请以公开 checksum（而不是仅凭 asset 名称或 URL）识别这组已验证字节，并
以仓库 README 了解当前发布状态。

## 许可证与项目导航

本项目使用 [MIT License](LICENSE)。浏览器 bundle 中包含的依赖声明记录在
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

- [产品规范](docs/SPEC.md)
- [当前状态与恢复入口](docs/STATUS.md)
- [验证方法、证据与限制](docs/VERIFICATION.md)
