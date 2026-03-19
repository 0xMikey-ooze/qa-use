import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

vi.mock('../db/db', () => ({
  db: {
    query: { testRun: { findFirst: vi.fn(), findMany: vi.fn() } },
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn() })) })),
    transaction: vi.fn(),
  },
}))

vi.mock('../resend/client', () => ({
  resend: null,
}))

vi.mock('./client', () => ({
  inngest: {
    createFunction: vi.fn((_opts, _event, handler) => handler),
  },
}))

describe('Browser Use API endpoint', () => {
  const functionsFilePath = path.resolve(__dirname, 'functions.tsx')
  let sourceCode: string

  beforeEach(() => {
    sourceCode = fs.readFileSync(functionsFilePath, 'utf-8')
  })

  it('does NOT call the old /api/v1/run-task endpoint', () => {
    expect(sourceCode).not.toContain("'/api/v1/run-task'")
    expect(sourceCode).not.toContain('"/api/v1/run-task"')
  })

  it('does NOT call /api/v2/run-task endpoint', () => {
    expect(sourceCode).not.toContain("'/api/v2/run-task'")
    expect(sourceCode).not.toContain('"/api/v2/run-task"')
  })

  it('calls the correct /api/v2/tasks endpoint', () => {
    expect(sourceCode).toContain("'/api/v2/tasks'")
  })

  it('no reference to /run-task anywhere in the source', () => {
    expect(sourceCode).not.toMatch(/\/run-task/)
  })
})

describe('Browser Use API v2 type definitions', () => {
  const typesFilePath = path.resolve(__dirname, '..', 'api', 'v1.d.ts')
  let typesSource: string

  beforeEach(() => {
    typesSource = fs.readFileSync(typesFilePath, 'utf-8')
  })

  it('defines the /api/v2/tasks path', () => {
    expect(typesSource).toContain('"/api/v2/tasks"')
  })

  it('defines a POST operation for /api/v2/tasks', () => {
    expect(typesSource).toMatch(/create_task_api_v2_tasks_post/)
  })

  it('response includes id and sessionId fields', () => {
    expect(typesSource).toContain('V2TaskCreatedResponse')
    expect(typesSource).toMatch(/sessionId/)
  })

  it('defines a 202 response for task creation', () => {
    const v2TasksSection = typesSource.substring(
      typesSource.indexOf('create_task_api_v2_tasks_post'),
    )
    expect(v2TasksSection).toContain('202')
  })
})

describe('Browser Use API client auth header', () => {
  const clientFilePath = path.resolve(__dirname, '..', 'api', 'client.ts')
  let clientSource: string

  beforeEach(() => {
    clientSource = fs.readFileSync(clientFilePath, 'utf-8')
  })

  it('uses X-Browser-Use-API-Key header for v2 auth', () => {
    expect(clientSource).toContain('X-Browser-Use-API-Key')
  })
})
