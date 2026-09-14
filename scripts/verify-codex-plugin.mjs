#!/usr/bin/env node

import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { handleRequest } from './convfusion-mcp.mjs'

const temp = await mkdtemp(join(tmpdir(), 'convfusion-codex-'))

try {
  const initialized = await handleRequest({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18' },
  })
  assert.equal(initialized.result.serverInfo.name, 'convfusion-codex')

  const listed = await handleRequest({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
  const names = listed.result.tools.map((tool) => tool.name)
  assert.equal(names.length, 13)
  for (const expected of [
    'research_workspace',
    'research_plan',
    'research_project',
    'research_evidence',
    'research_claim',
    'research_decision',
    'research_state_read',
    'research_state_propose',
    'research_paper',
    'research_output',
    'research_literature_search',
    'research_paper_download',
    'research_paper_latex',
  ]) assert.ok(names.includes(expected), `missing tool: ${expected}`)

  const init = await handleRequest({
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'research_workspace',
      arguments: {
        workspace_root: temp,
        action: 'init',
        topic: 'Verify the Codex adapter',
        domain: 'software engineering',
      },
    },
  })
  assert.equal(init.result.isError, false)
  assert.equal(init.result.structuredContent.workspace, join(temp, 'workspace'))
  assert.match(await readFile(join(temp, 'workspace', 'project.md'), 'utf8'), /Verify the Codex adapter/)

  const claim = await handleRequest({
    jsonrpc: '2.0',
    id: 4,
    method: 'tools/call',
    params: {
      name: 'research_claim',
      arguments: {
        workspace_root: temp,
        action: 'create',
        statement: 'The Codex MCP adapter preserves deterministic claim IDs.',
      },
    },
  })
  assert.equal(claim.result.isError, false)
  assert.equal(claim.result.structuredContent.claim.id, 'C001')

  const evidence = await handleRequest({
    jsonrpc: '2.0',
    id: 5,
    method: 'tools/call',
    params: {
      name: 'research_evidence',
      arguments: {
        workspace_root: temp,
        action: 'create',
        name: 'Adapter verification',
        source_kind: 'implementation',
        claim: 'The adapter initialized and wrote a claim.',
        result: 'project.md and C001.md exist in the generated workspace.',
        raw_artifacts: ['workspace/project.md', 'workspace/research/claims/C001.md'],
        supports: ['C001'],
      },
    },
  })
  assert.equal(evidence.result.isError, false)
  assert.equal(evidence.result.structuredContent.evidence.id, 'E001')

  const status = await handleRequest({
    jsonrpc: '2.0',
    id: 6,
    method: 'tools/call',
    params: { name: 'research_workspace', arguments: { workspace_root: temp, action: 'status' } },
  })
  assert.deepEqual(status.result.structuredContent.counts, {
    evidence: 1,
    claims: 1,
    decisions: 0,
    plans: 0,
    pendingStateProposals: 0,
  })

  console.log(`Codex adapter verification passed (${names.length} MCP tools).`)
} finally {
  await rm(temp, { recursive: true, force: true })
}
