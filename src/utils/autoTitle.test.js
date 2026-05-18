import { describe, it, expect } from 'vitest'
import { autoTitle } from './autoTitle.js'

describe('autoTitle', () => {
  it('extracts H1 heading', () => {
    expect(autoTitle('# Hello\nsome content')).toBe('Hello')
  })

  it('falls through to first non-empty line when first heading is not H1 (##)', () => {
    expect(autoTitle('## Sub\nPlain text first line')).toBe('Plain text first line')
  })

  it('uses first non-empty line when no heading at all', () => {
    expect(autoTitle('Plain text first line\nmore')).toBe('Plain text first line')
  })

  it('converts [link](url) to link text', () => {
    expect(autoTitle('[link](url) rest')).toBe('link rest')
  })

  it('truncates to 40 chars and appends ellipsis', () => {
    const long = 'A'.repeat(60)
    const result = autoTitle(long)
    expect(result).toBe('A'.repeat(40) + '…')
  })

  it('returns Untitled for empty content', () => {
    expect(autoTitle('')).toBe('Untitled')
  })

  it('returns Untitled for whitespace-only content', () => {
    expect(autoTitle('   \n  \n')).toBe('Untitled')
  })

  it('preserves emoji', () => {
    expect(autoTitle('# Hello 🌍')).toBe('Hello 🌍')
  })

  it('strips leading/trailing markdown punctuation', () => {
    expect(autoTitle('# **Bold Title**')).toBe('Bold Title')
  })

  it('strips ==highlight== markers', () => {
    expect(autoTitle('==highlighted== text')).toBe('highlighted text')
  })

  it('strips leading/trailing backticks', () => {
    expect(autoTitle('`code` title')).toBe('code title')
  })
})
