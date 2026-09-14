# ConvFusion for Codex

**v0.3.0**

ConvFusion 是面向 Codex 的本地优先科研操作层。它把科研方法、计划、证据、主张、决策、研究状态、论文演化与多类型成果组织成可追溯资产，同时把推理、编码、浏览、实验和审批交给 Codex 原生运行时。

本仓库由 [ConvFusion for DeepSeek Harness](https://github.com/ConvFusion/ConvFusion-dsh) 移植而来。移植是宿主适配，不是简单替换依赖：科研领域 Core 被保留，Cordis/DSH 注册层改为 Codex Skill 与本地 STDIO MCP。

## 已移植能力

- `$convfusion-research` 总控 Skill，支持显式调用和科研请求的隐式匹配
- 50 份科研方法参考库，按问题理解、文献、创新、方法、实验、分析、决策、管理和写作分类按需加载
- 插件内置本地 STDIO MCP，不需要部署服务器或开放端口
- 原有 11 个科研工具：Project、Evidence、Claim、Decision、Research State、Paper、Output、OpenAlex 检索、全文下载和 LaTeX
- 新增 `research_workspace` 与 `research_plan`，承担原 `/research` 命令中的初始化、状态检查和 Plan 生命周期管理
- 兼容既有 ConvFusion 工作区；新项目默认写入当前任务目录下的 `workspace/`
- Evidence/Claim 双向引用、ID 自动分配、不可删除式取代、状态提案人工审核、Paper/Output 版本与 provenance 等确定性约束

## 暂未移植

以下内容属于 DeepSeek Harness 宿主层，不能原样复用：

- Cordis `ctx.*` 服务注入与 DSH 会话事件
- Harness 设置页、同源 RPC、进度卡与 React slot
- DSH `/research` 命令注册
- 基于 DSH 事件的自动继续

Codex 版本首版以无 UI、无 Hook 也能正确工作为验收边界。后续可独立增加 MCP Apps UI 或 Codex Hooks，而不改变研究资产格式。

## 目录

```text
.
├── .codex-plugin/plugin.json        # Codex 插件清单
├── .mcp.json                        # 本地 STDIO MCP 配置
├── skills/convfusion-research/
│   ├── SKILL.md                     # 总控工作流
│   └── references/                  # 50 份科研方法与适配契约
├── scripts/convfusion-mcp.mjs       # Codex MCP 适配器
├── lib/research/                    # 共享科研领域 Core
└── src/                             # TypeScript 源码与旧宿主适配代码
```

## 使用

将当前目录作为本地 Codex 插件源安装后，请在一个新任务中使用：

```text
$convfusion-research 帮我建立一个关于无人机视觉-LiDAR 跨模态定位的研究项目
```

也可以直接提出匹配的科研请求。Skill 会先只读检查当前任务工作区；只有用户明确要求初始化时，才创建：

```text
<task-cwd>/workspace/
├── project.md
├── research-state.md
├── plans/
└── research/
    ├── evidence/
    ├── claims/
    ├── decisions/
    └── state-history/
```

每个 MCP 调用都显式传入当前 Codex 任务的绝对工作目录，插件进程自身的安装目录不会被误当成研究目录。

OpenAlex Key 是可选的：

```bash
export OPENALEX_API_KEY="..."
export OPENALEX_MAILTO="you@example.com"
```

密钥只用于请求，不写入研究资产或工具结果。

## 验证

核心适配器不需要安装 npm 依赖即可验证：

```bash
npm run verify:codex
python3 /path/to/plugin-creator/scripts/validate_plugin.py .
```

第一条测试真实完成 MCP 初始化、13 个工具发现、临时研究工作区初始化、Claim/Evidence 写入和最终状态读取。第二条使用 Codex 的插件清单校验器检查 manifest、Skill、MCP 配置与资源路径。

## 兼容性说明

`src/index.ts`、`src/client/` 与 `cordis.patch.yml` 保留了上游 DSH Adapter，便于后续抽取共享 Core 或维护双宿主版本；Codex 不加载这些入口。Codex 实际入口只有 `.codex-plugin/plugin.json`、Skill 和 `.mcp.json`。

## 许可证

Apache-2.0（沿用仓库现有 `LICENSE`）。
