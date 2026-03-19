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

  it('calls the correct /api/v2/tasks endpoint for task creation', () => {
    expect(sourceCode).toContain("'/api/v2/tasks'")
  })

  it('no reference to /run-task anywhere in the source', () => {
    expect(sourceCode).not.toMatch(/\/run-task/)
  })
})

describe('Browser Use API v2 task status polling', () => {
  const functionsFilePath = path.resolve(__dirname, 'functions.tsx')
  let sourceCode: string

  beforeEach(() => {
    sourceCode = fs.readFileSync(functionsFilePath, 'utf-8')
  })

  it('polls using the v2 endpoint GET /api/v2/tasks/{taskId}', () => {
    expect(sourceCode).toContain("'/api/v2/tasks/{taskId}'")
  })

  it('does NOT poll using the old v1 endpoint GET /api/v1/task/{task_id}', () => {
    expect(sourceCode).not.toContain("'/api/v1/task/{task_id}'")
  })

  it('handles all v2 status values: running, finished, failed, stopped, paused, created', () => {
    const pollFnStart = sourceCode.indexOf('async function _pollTaskUntilFinished')
    const pollFnEnd = sourceCode.indexOf('\nasync function', pollFnStart + 1)
    const pollFnBody = sourceCode.substring(pollFnStart, pollFnEnd > 0 ? pollFnEnd : undefined)

    expect(pollFnBody).toContain("'finished'")
    expect(pollFnBody).toContain("'running'")
    expect(pollFnBody).toContain("'failed'")
    expect(pollFnBody).toContain("'stopped'")
    expect(pollFnBody).toContain("'paused'")
    expect(pollFnBody).toContain("'created'")
  })

  it('treats stopped like failed — updates DB and returns ok: false', () => {
    const pollFnStart = sourceCode.indexOf('async function _pollTaskUntilFinished')
    const pollFnEnd = sourceCode.indexOf('\nasync function', pollFnStart + 1)
    const pollFnBody = sourceCode.substring(pollFnStart, pollFnEnd > 0 ? pollFnEnd : undefined)

    const stoppedCaseStart = pollFnBody.indexOf("case 'stopped'")
    expect(stoppedCaseStart).toBeGreaterThan(-1)

    const stoppedSection = pollFnBody.substring(stoppedCaseStart, stoppedCaseStart + 400)
    expect(stoppedSection).toContain("status: 'failed'")
    expect(stoppedSection).toContain('ok: false')
  })

  it('treats paused like running — continues polling', () => {
    const pollFnStart = sourceCode.indexOf('async function _pollTaskUntilFinished')
    const pollFnEnd = sourceCode.indexOf('\nasync function', pollFnStart + 1)
    const pollFnBody = sourceCode.substring(pollFnStart, pollFnEnd > 0 ? pollFnEnd : undefined)

    const pausedCaseStart = pollFnBody.indexOf("case 'paused'")
    expect(pausedCaseStart).toBeGreaterThan(-1)
  })

  it('treats created like running — continues polling', () => {
    const pollFnStart = sourceCode.indexOf('async function _pollTaskUntilFinished')
    const pollFnEnd = sourceCode.indexOf('\nasync function', pollFnStart + 1)
    const pollFnBody = sourceCode.substring(pollFnStart, pollFnEnd > 0 ? pollFnEnd : undefined)

    const createdCaseStart = pollFnBody.indexOf("case 'created'")
    expect(createdCaseStart).toBeGreaterThan(-1)
  })

  it('has a default case that does not throw and continues polling', () => {
    const pollFnStart = sourceCode.indexOf('async function _pollTaskUntilFinished')
    const pollFnEnd = sourceCode.indexOf('\nasync function', pollFnStart + 1)
    const pollFnBody = sourceCode.substring(pollFnStart, pollFnEnd > 0 ? pollFnEnd : undefined)

    expect(pollFnBody).toContain('default:')
    expect(pollFnBody).not.toContain('ExhaustiveSwitchCheck')
  })
})

describe('Browser Use API v2 type definitions', () => {
  const typesFilePath = path.resolve(__dirname, '..', 'api', 'v1.d.ts')
  let typesSource: string

  beforeEach(() => {
    typesSource = fs.readFileSync(typesFilePath, 'utf-8')
  })

  it('defines the /api/v2/tasks path for POST', () => {
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

  it('defines the /api/v2/tasks/{taskId} path for GET', () => {
    expect(typesSource).toContain('"/api/v2/tasks/{taskId}"')
  })

  it('defines a GET operation for /api/v2/tasks/{taskId}', () => {
    expect(typesSource).toMatch(/get_task_api_v2_tasks__taskId__get/)
  })

  it('defines V2TaskStatusResponse with id, status, output, isSuccess', () => {
    expect(typesSource).toContain('V2TaskStatusResponse')

    const responseStart = typesSource.indexOf('V2TaskStatusResponse')
    const responseSection = typesSource.substring(responseStart, responseStart + 400)

    expect(responseSection).toContain('id')
    expect(responseSection).toContain('status')
    expect(responseSection).toContain('output')
    expect(responseSection).toContain('isSuccess')
  })

  it('defines V2TaskStatusEnum with all possible statuses', () => {
    expect(typesSource).toContain('V2TaskStatusEnum')
    expect(typesSource).toContain('"running"')
    expect(typesSource).toContain('"finished"')
    expect(typesSource).toContain('"failed"')
    expect(typesSource).toContain('"stopped"')
    expect(typesSource).toContain('"paused"')
    expect(typesSource).toContain('"created"')
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
