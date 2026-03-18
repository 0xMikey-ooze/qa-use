import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('pg', () => {
  const MockPool = vi.fn()
  return { Pool: MockPool }
})

describe('db lazy initialization', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('does not create a Pool on import', async () => {
    const { Pool } = await import('pg')
    await import('./db')
    expect(Pool).not.toHaveBeenCalled()
  })

  it('creates a Pool only when db is first used', async () => {
    const { Pool } = await import('pg')
    const { getDb } = await import('./db')
    expect(Pool).not.toHaveBeenCalled()
    getDb()
    expect(Pool).toHaveBeenCalledTimes(1)
  })

  it('reuses the same Pool on subsequent calls', async () => {
    const { Pool } = await import('pg')
    const { getDb } = await import('./db')
    getDb()
    getDb()
    expect(Pool).toHaveBeenCalledTimes(1)
  })
})
