import { describe, it, expect, beforeEach } from 'vitest'
import { storageGet, storageSet } from './storage.js'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('returns null for missing keys', () => {
    expect(storageGet('missing')).toBeNull()
  })

  it('saves and retrieves a string', () => {
    storageSet('key', 'hello')
    expect(storageGet('key')).toBe('hello')
  })

  it('saves and retrieves a plain object', () => {
    storageSet('obj', { a: 1 })
    expect(storageGet('obj')).toEqual({ a: 1 })
  })
})
