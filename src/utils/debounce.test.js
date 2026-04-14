import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from './debounce.js'

describe('debounce', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('calls the function after the delay', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced('a')
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledWith('a')
  })

  it('only calls once when invoked rapidly', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)
    debounced('a')
    debounced('b')
    debounced('c')
    vi.advanceTimersByTime(200)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('c')
  })
})
