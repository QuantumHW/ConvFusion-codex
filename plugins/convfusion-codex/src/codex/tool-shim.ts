/**
 * Host-neutral tool definition used by both the legacy DSH adapter and the
 * Codex MCP adapter.  DSH's defineTool() is an identity-style schema helper;
 * keeping the data shape local prevents the research core from depending on
 * a particular agent runtime.
 */
export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue }

export interface ToolOutputDefinition {
  schema: Record<string, unknown>
  render: (args: unknown, value: JsonValue) => unknown
}

export interface ToolDefinition {
  name: string
  description: string
  parameters: Record<string, unknown>
  output: ToolOutputDefinition
  isConcurrencySafe?: (...args: unknown[]) => boolean
  execute: (args: unknown, exec?: { agent?: { id?: unknown } | null }) => Promise<unknown> | unknown
  presentCall?: (...args: unknown[]) => unknown
}

export function defineTool<T extends ToolDefinition>(definition: T): T {
  return definition
}
