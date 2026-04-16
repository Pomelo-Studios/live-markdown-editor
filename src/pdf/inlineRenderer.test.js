// src/pdf/inlineRenderer.test.js
import { describe, test, expect } from 'vitest'
import { renderInline } from './inlineRenderer.js'

const S = {
  body:       { fontSize: 12, color: '#333333' },
  link:       { color: '#6d28d9', decoration: 'underline' },
  code:       { fontSize: 10, background: '#f4f4f4', color: '#333333' },
  inlineCode: { background: '#eeeeee', color: '#d63e6b' },
}

describe('renderInline', () => {
  test('plain text node', () => {
    const out = renderInline([{ type: 'text', text: 'Hello' }], S)
    expect(out).toEqual([{ text: 'Hello' }])
  })

  test('strong applies bold to leaf nodes', () => {
    const out = renderInline([{ type: 'strong', tokens: [{ type: 'text', text: 'Bold' }] }], S)
    expect(out[0].bold).toBe(true)
    expect(out[0].text).toBe('Bold')
  })

  test('em wraps children with italics', () => {
    const out = renderInline([{ type: 'em', tokens: [{ type: 'text', text: 'It' }] }], S)
    expect(out[0].italics).toBe(true)
  })

  test('del adds lineThrough decoration', () => {
    const out = renderInline([{ type: 'del', tokens: [{ type: 'text', text: 'del' }] }], S)
    expect(out[0].decoration).toBe('lineThrough')
  })

  test('codespan uses inline code styles with background', () => {
    const out = renderInline([{ type: 'codespan', text: 'x++' }], S)
    expect(out[0].text).toBe('x++')
    expect(out[0].background).toBe(S.inlineCode.background)
    expect(out[0].color).toBe(S.inlineCode.color)
  })

  test('external link sets link href', () => {
    const out = renderInline([{ type: 'link', href: 'https://example.com', tokens: [{ type: 'text', text: 'Ex' }] }], S)
    expect(out[0].link).toBe('https://example.com')
    expect(out[0].linkToDestination).toBeUndefined()
  })

  test('internal anchor link uses linkToDestination', () => {
    const out = renderInline([{ type: 'link', href: '#my-section', tokens: [{ type: 'text', text: 'Go' }] }], S)
    expect(out[0].linkToDestination).toBe('my-section')
    expect(out[0].link).toBeUndefined()
  })

  test('highlight token gets amber background', () => {
    const out = renderInline([{ type: 'highlight', text: 'mark' }], S)
    expect(out[0].background).toBe('#fef08a')
  })

  test('empty array returns empty array', () => {
    expect(renderInline([], S)).toEqual([])
  })
})
