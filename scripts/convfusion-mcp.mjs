#!/usr/bin/env node

import { isAbsolute, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineResearchTools } from '../lib/research/research-tools.js'
import { researchWorkspaceOf } from '../lib/research/workspace.js'
import { ensureWorkspaceLayout, inspectWorkspace } from '../lib/research/workspace-layout.js'
import { loadProjectFile, saveProjectFile } from '../lib/research/project.js'
import {
  ensureResearchState,
  loadResearchState,
  listStateProposals,
} from '../lib/research/research-state.js'
import { listEvidence } from '../lib/research/evidence.js'
import { listClaims, listDecisions } from '../lib/research/claims.js'
import {
  approvePlan,
  archivePlan,
  completePlan,
  createPlan,
  isPlanWriteError,
  loadPlanLibrary,
  markPlanExecuting,
  reviewPlan,
  setPlanStatus,
} from '../lib/research/plan-library.js'

const SERVER_INFO = { name: 'convfusion-codex', version: '0.3.0' }

function objectSchema(properties, required = []) {
  return { type: 'object', properties, required, additionalProperties: false }
}

function workspaceProperty() {
  return {
    type: 'string',
    description:
      'Absolute path of the current Codex task workspace. Pass the task cwd, not the plugin installation directory. ConvFusion stores its data in the workspace/ child when using the current layout.',
  }
}

function sessionRoot(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('workspace_root is required')
  if (!isAbsolute(value)) throw new Error('workspace_root must be an absolute path')
  return resolve(value)
}

function researchRoot(value) {
  return researchWorkspaceOf(sessionRoot(value))
}

function concisePlan(doc) {
  return {
    id: doc.id,
    name: doc.name,
    status: doc.status,
    version: doc.version,
    sourceSkill: doc.sourceSkill,
    paper: doc.paper,
    path: doc.relPath,
  }
}

const workspaceTool = {
  name: 'research_workspace',
  description:
    'Initialize or inspect a ConvFusion research workspace. `status` is read-only. `init` creates the minimal workspace layout, project.md, and research-state.md; only call init when the user asked to start or initialize a research project.',
  parameters: {
    workspace_root: workspaceProperty(),
    action: { type: 'string', enum: ['status', 'init'] },
    topic: { type: 'string', description: 'Required for init: the research topic.' },
    domain: { type: 'string' },
    goal: { type: 'string' },
    questions: { type: 'array', items: { type: 'string' } },
  },
  async execute(args) {
    const root = researchRoot(args.workspace_root)
    const action = args.action ?? 'status'
    if (action === 'init') {
      const topic = typeof args.topic === 'string' ? args.topic.trim() : ''
      if (!topic) return { ok: false, error: 'topic is required for init' }
      const createdDirectories = ensureWorkspaceLayout(root)
      const project = saveProjectFile(root, {
        topic,
        ...(args.domain ? { domain: String(args.domain) } : {}),
        ...(args.goal ? { goal: String(args.goal) } : {}),
        ...(Array.isArray(args.questions) ? { questions: args.questions.map(String) } : {}),
      })
      const state = ensureResearchState(root)
      if (state && typeof state === 'object' && 'error' in state) return { ok: false, error: state.error }
      return { ok: true, action, workspace: root, createdDirectories, project, stateVersion: state.version }
    }
    if (action !== 'status') return { ok: false, error: `Unknown action "${action}".` }
    const project = loadProjectFile(root)
    const state = loadResearchState(root)
    const inspection = inspectWorkspace(root)
    return {
      ok: true,
      action,
      workspace: root,
      isResearch: inspection.isResearch,
      project,
      state: state
        ? { version: state.version, dimensions: state.dimensions, maturity: state.maturity }
        : null,
      counts: {
        evidence: listEvidence(root).length,
        claims: listClaims(root).length,
        decisions: listDecisions(root).length,
        plans: loadPlanLibrary(root).counts.total,
        pendingStateProposals: listStateProposals(root).length,
      },
      layout: inspection.entries,
      unexpectedTopLevel: inspection.unexpectedTopLevel,
      unexpectedOutputDirs: inspection.unexpectedOutputDirs,
    }
  },
}

const planTool = {
  name: 'research_plan',
  description:
    'Create, list, and move research Plan assets through their validated lifecycle. A plan is data, not a workflow engine. Do not mark a draft reviewed/ready unless the user actually reviewed or approved it; auto-execute plans are the explicit exception encoded in the plan.',
  parameters: {
    workspace_root: workspaceProperty(),
    action: {
      type: 'string',
      enum: ['list', 'create', 'set_status', 'review', 'approve', 'executing', 'complete', 'archive'],
    },
    id: { type: 'string' },
    name: { type: 'string' },
    type: { type: 'string' },
    status: { type: 'string' },
    source_skill: { type: 'string' },
    source_skill_version: { type: 'string' },
    paper: { type: 'string' },
    research_context: { type: 'string' },
    review_policy: { type: 'string', enum: ['review-required', 'auto-execute'] },
    objective: { type: 'string' },
    strategy: { type: 'string' },
    expected_evidence: { type: 'string' },
    completion_criteria: { type: 'string' },
  },
  async execute(args) {
    const root = researchRoot(args.workspace_root)
    const action = args.action ?? 'list'
    if (action === 'list') {
      const library = loadPlanLibrary(root)
      return { ok: true, counts: library.counts, plans: library.entries.map((entry) => concisePlan(entry.document)) }
    }
    let result
    if (action === 'create') {
      result = createPlan(root, {
        name: String(args.name ?? ''),
        ...(args.id ? { id: String(args.id) } : {}),
        ...(args.type ? { type: String(args.type) } : {}),
        ...(args.status ? { status: String(args.status) } : {}),
        ...(args.source_skill ? { sourceSkill: String(args.source_skill) } : {}),
        ...(args.source_skill_version ? { sourceSkillVersion: String(args.source_skill_version) } : {}),
        ...(args.paper ? { paper: String(args.paper) } : {}),
        ...(args.research_context ? { researchContext: String(args.research_context) } : {}),
        ...(args.review_policy ? { reviewPolicy: String(args.review_policy) } : {}),
        ...(args.objective ? { objective: String(args.objective) } : {}),
        ...(args.strategy ? { strategy: String(args.strategy) } : {}),
        ...(args.expected_evidence ? { expectedEvidence: String(args.expected_evidence) } : {}),
        ...(args.completion_criteria ? { completionCriteria: String(args.completion_criteria) } : {}),
      })
    } else {
      const id = String(args.id ?? '')
      if (!id) return { ok: false, error: 'id is required for this action' }
      if (action === 'set_status') result = setPlanStatus(root, id, String(args.status ?? ''))
      else if (action === 'review') result = reviewPlan(root, id)
      else if (action === 'approve') result = approvePlan(root, id)
      else if (action === 'executing') result = markPlanExecuting(root, id)
      else if (action === 'complete') result = completePlan(root, id)
      else if (action === 'archive') result = archivePlan(root, id)
      else return { ok: false, error: `Unknown action "${action}".` }
    }
    if (isPlanWriteError(result)) return { ok: false, error: result.error }
    return { ok: true, action, plan: concisePlan(result) }
  },
}

const nativeTools = defineResearchTools(
  (agent) => {
    if (typeof agent?.id !== 'string') throw new Error('workspace_root was not supplied')
    return agent.id
  },
  {
    apiKey: () => process.env.OPENALEX_API_KEY ?? '',
    mailto: () => process.env.OPENALEX_MAILTO,
    fetchImpl: globalThis.fetch,
  },
  { fetchImpl: globalThis.fetch },
)

const definitions = [workspaceTool, planTool, ...nativeTools]
const byName = new Map(definitions.map((tool) => [tool.name, tool]))

function advertisedTool(tool) {
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: objectSchema(
      { workspace_root: workspaceProperty(), ...tool.parameters },
      ['workspace_root'],
    ),
  }
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value, (_key, item) => (typeof item === 'bigint' ? item.toString() : item)))
}

async function callTool(name, rawArgs) {
  const tool = byName.get(name)
  if (!tool) throw new Error(`Unknown tool: ${name}`)
  const args = rawArgs && typeof rawArgs === 'object' && !Array.isArray(rawArgs) ? { ...rawArgs } : {}
  const root = researchRoot(args.workspace_root)
  delete args.workspace_root
  const value = tool === workspaceTool || tool === planTool
    ? await tool.execute({ ...args, workspace_root: sessionRoot(rawArgs.workspace_root) })
    : await tool.execute(args, { agent: { id: root } })
  const structuredContent = jsonSafe(value)
  return {
    content: [{ type: 'text', text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent,
    isError: structuredContent?.ok === false,
  }
}

export async function handleRequest(message) {
  const { id, method, params = {} } = message
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params.protocolVersion ?? '2025-06-18',
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          'ConvFusion stores research data under the current task workspace. Every tool requires workspace_root; pass the absolute Codex task cwd, never this plugin installation directory.',
      },
    }
  }
  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id, result: { tools: definitions.map(advertisedTool) } }
  }
  if (method === 'tools/call') {
    try {
      return { jsonrpc: '2.0', id, result: await callTool(params.name, params.arguments) }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }],
          isError: true,
        },
      }
    }
  }
  if (method === 'ping') return { jsonrpc: '2.0', id, result: {} }
  if (id === undefined || id === null) return null
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `Method not found: ${method}` } }
}

export function serveStdio() {
  let buffer = ''
  process.stdin.setEncoding('utf8')
  process.stdin.on('data', (chunk) => {
    buffer += chunk
    while (true) {
      const newline = buffer.indexOf('\n')
      if (newline < 0) break
      const line = buffer.slice(0, newline).trim()
      buffer = buffer.slice(newline + 1)
      if (!line) continue
      let message
      try {
        message = JSON.parse(line)
      } catch (error) {
        process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: String(error) } })}\n`)
        continue
      }
      Promise.resolve(handleRequest(message))
        .then((response) => {
          if (response) process.stdout.write(`${JSON.stringify(response)}\n`)
        })
        .catch((error) => {
          process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: message.id ?? null, error: { code: -32603, message: String(error) } })}\n`)
        })
    }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) serveStdio()
