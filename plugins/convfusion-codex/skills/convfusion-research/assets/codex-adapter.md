# Codex adapter contract

## Architecture

```text
Codex native runtime
├── convfusion-research skill
│   └── method references (50 files, loaded on demand)
└── local STDIO MCP server
    └── shared ConvFusion research core
        └── <task workspace>/workspace/
```

The shared core owns deterministic file formats, identifiers, lifecycle checks, provenance, and history. Codex owns reasoning, tool choice, shell/file/browser execution, approvals, and conversation state.

## Workspace ownership

Every MCP call requires `workspace_root`, the absolute working directory of the current Codex task. The MCP process runs from the installed plugin directory, so its process cwd is never authoritative research context.

For a new project, ConvFusion stores generated research assets in `<workspace_root>/workspace/`. Existing projects that already place `project.md` or `research-state.md` at the task root remain supported.

## What was intentionally not copied from DeepSeek Harness

- Cordis service injection and `ctx.*` lifecycle APIs
- DSH-specific slash-command registration
- DSH settings RPC and React slot injection
- DSH session event observation and progress-card rendering
- automatic continuation driven by DSH agent events

These are host adapters, not research-domain behavior. A future Codex adapter may add hooks or MCP Apps UI, but core correctness must not depend on either.

## Review boundaries

- Research State: agent creates a proposal; user disposition is a separate explicit action.
- Paper: agent creates a revision proposal; user accepts, edits, or rejects it explicitly.
- Plans: draft by default; review and approval are real lifecycle transitions, not labels inferred from a conversation.
- Evidence: preserve old records through supersession rather than deletion.

## Method library

The method library is reference content for the `convfusion-research` skill. It is not exposed as 50 peer skills because large flat skill lists compete for discovery context. Select the smallest relevant method set from the category directories.
