// src/pdf/blockRenderer.test.js
import { describe, test, expect, vi } from 'vitest'

vi.mock('../preview.js', () => ({
  slugify: (text) =>
    text
      .replace(/<[^>]+>/g, '')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-'),
}))

import { renderTokens } from './blockRenderer.js'

const S = {
  body:       { fontSize: 12, color: '#333333' },
  headings:   {
    1: { fontSize: 27, color: '#111111', bold: true, marginTop: 14, marginBottom: 4 },
    2: { fontSize: 21, color: '#222222', bold: true, marginTop: 12, marginBottom: 4 },
  },
  link:       { color: '#6d28d9', decoration: 'underline' },
  code:       { background: '#f4f4f4', color: '#333333', fontSize: 10 },
  inlineCode: { background: '#eeeeee', color: '#d63e6b' },
  blockquote: { border: '#6d28d9', background: '#f5f0ff' },
  checkbox:   { color: '#6d28d9' },
  contentWidth: 460,
  bgColor:    '#ffffff',
}

describe('renderTokens', () => {
  test('heading carries id and correct fontSize', () => {
    const tokens = [{ type: 'heading', depth: 1, text: 'Hello World', tokens: [{ type: 'text', text: 'Hello World' }] }]
    const out = renderTokens(tokens, S)
    // id is now on the heading block itself (no separate invisible anchor)
    expect(out[0].id).toBe('hello-world')
    expect(out[0].fontSize).toBe(S.headings[1].fontSize)
  })

  test('heading depth 2 uses h2 style', () => {
    const tokens = [{ type: 'heading', depth: 2, text: 'Sub', tokens: [{ type: 'text', text: 'Sub' }] }]
    const out = renderTokens(tokens, S)
    expect(out[0].fontSize).toBe(S.headings[2].fontSize)
    expect(out[0].bold).toBe(true)
  })

  test('hr produces a canvas line', () => {
    const out = renderTokens([{ type: 'hr' }], S)
    expect(out[0].canvas).toBeDefined()
    expect(out[0].canvas[0].type).toBe('line')
  })

  test('space produces nothing', () => {
    const out = renderTokens([{ type: 'space' }], S)
    expect(out).toHaveLength(0)
  })

  test('unordered list uses ul key', () => {
    const tokens = [{
      type: 'list', ordered: false,
      items: [{ tokens: [{ type: 'text', text: 'A', tokens: [{ type: 'text', text: 'A' }] }], task: false }],
    }]
    const out = renderTokens(tokens, S)
    expect(out[0].ul).toBeDefined()
  })

  test('ordered list uses ol key', () => {
    const tokens = [{
      type: 'list', ordered: true, start: 1,
      items: [{ tokens: [{ type: 'text', text: 'A', tokens: [{ type: 'text', text: 'A' }] }], task: false }],
    }]
    const out = renderTokens(tokens, S)
    expect(out[0].ol).toBeDefined()
  })

  test('code block is wrapped in a table for background', () => {
    const out = renderTokens([{ type: 'code', text: 'x = 1', lang: '' }], S)
    expect(out[0].table).toBeDefined()
  })

  test('empty input returns empty array', () => {
    expect(renderTokens([], S)).toEqual([])
  })
})
