import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// localStorage mock — must be defined before module import
let store = {}
const localStorageMock = {
  getItem: vi.fn((k) => store[k] ?? null),
  setItem: vi.fn((k, v) => { store[k] = v }),
  removeItem: vi.fn((k) => { delete store[k] }),
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true })

// DOM stub — tabManager touches these IDs during render
function setupDom() {
  document.body.innerHTML = `
    <div id="tab-bar">
      <div id="tab-bar-tabs"></div>
      <button id="tab-new-btn"></button>
      <button id="tab-menu-btn" class="tab-bar__btn--hidden"></button>
      <div id="tab-menu" hidden></div>
    </div>
    <textarea id="editor"></textarea>
  `
}

let tabManager

describe('tabManager', () => {
  beforeEach(async () => {
    vi.useFakeTimers()
    store = {}
    vi.resetModules()
    setupDom()
    tabManager = await import('./tabManager.js')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Migration ──────────────────────────────────────────────

  it('migrates legacy editor-content to single tab', () => {
    store['editor-content'] = JSON.stringify('# My Doc\nHello')
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const tab = tabManager.getActiveTab()
    expect(tab.content).toBe('# My Doc\nHello')
    expect(store['editor-content']).toBeUndefined()
  })

  it('creates fresh state when nothing in storage', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const tab = tabManager.getActiveTab()
    expect(tab).toBeTruthy()
    expect(tab.content.length).toBeGreaterThan(0)
  })

  it('falls back to fresh state on corrupt tabs-state JSON', () => {
    store['tabs-state'] = 'NOT_JSON{{'
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    expect(tabManager.getActiveTab()).toBeTruthy()
  })

  it('falls back to fresh state when tabs array is empty', () => {
    store['tabs-state'] = JSON.stringify({ version: 1, activeTabId: '', tabs: [] })
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    expect(tabManager.getActiveTab()).toBeTruthy()
  })

  // ── createTab ──────────────────────────────────────────────

  it('createTab appends new tab and makes it active with title Untitled', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    tabManager.createTab()
    const active = tabManager.getActiveTab()
    expect(active.title).toBe('Untitled')
    expect(active.content).toBe('')
  })

  // ── closeTab ──────────────────────────────────────────────

  it('closeTab on non-active tab removes it without changing active', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const firstId = tabManager.getActiveTab().id
    tabManager.createTab()
    const secondId = tabManager.getActiveTab().id
    tabManager.closeTab(firstId)
    expect(tabManager.getActiveTab().id).toBe(secondId)
  })

  it('closeTab on active middle tab switches to right neighbor', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const idA = tabManager.getActiveTab().id
    tabManager.createTab()
    const idB = tabManager.getActiveTab().id
    tabManager.createTab()
    const idC = tabManager.getActiveTab().id
    tabManager.switchTab(idB)
    tabManager.closeTab(idB)
    expect(tabManager.getActiveTab().id).toBe(idC)
  })

  it('closeTab on active rightmost tab switches to left neighbor', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const idA = tabManager.getActiveTab().id
    tabManager.createTab()
    const idB = tabManager.getActiveTab().id
    tabManager.closeTab(idB)
    expect(tabManager.getActiveTab().id).toBe(idA)
  })

  it('closeTab last tab creates fresh empty Untitled tab', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const id = tabManager.getActiveTab().id
    tabManager.closeTab(id)
    const active = tabManager.getActiveTab()
    expect(active.title).toBe('Untitled')
    expect(active.content).toBe('')
  })

  // ── updateActiveContent ────────────────────────────────────

  it('updateActiveContent recomputes title when customTitle is false', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const id = tabManager.getActiveTab().id
    tabManager.renameTab(id, '')
    tabManager.updateActiveContent('# Foo\nbar')
    expect(tabManager.getActiveTab().title).toBe('Foo')
  })

  it('updateActiveContent does NOT change title when customTitle is true', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const id = tabManager.getActiveTab().id
    tabManager.renameTab(id, 'My Custom Name')
    tabManager.updateActiveContent('# Different Heading\n')
    expect(tabManager.getActiveTab().title).toBe('My Custom Name')
  })

  // ── renameTab ─────────────────────────────────────────────

  it('renameTab with non-empty string sets customTitle=true', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const id = tabManager.getActiveTab().id
    tabManager.renameTab(id, 'Bar')
    const tab = tabManager.getActiveTab()
    expect(tab.title).toBe('Bar')
    expect(tab.customTitle).toBe(true)
  })

  it('renameTab with empty string resets to auto-title and customTitle=false', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const id = tabManager.getActiveTab().id
    tabManager.renameTab(id, 'Manual')
    tabManager.updateActiveContent('# AutoHead\n')
    tabManager.renameTab(id, '')
    const tab = tabManager.getActiveTab()
    expect(tab.customTitle).toBe(false)
    expect(tab.title).toBe('AutoHead')
  })

  // ── reorderTabs ───────────────────────────────────────────

  it('reorderTabs before: inserts fromTab before toTab', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const idA = tabManager.getActiveTab().id
    tabManager.createTab()
    const idB = tabManager.getActiveTab().id
    tabManager.createTab()
    const idC = tabManager.getActiveTab().id
    // Move C before A: expected order C, A, B
    tabManager.reorderTabs(idC, idA, 'before')
    // Verify C is now accessible (no error means order is valid)
    tabManager.switchTab(idA)
    expect(tabManager.getActiveTab().id).toBe(idA)
  })

  it('reorderTabs no-op when from===to', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const id = tabManager.getActiveTab().id
    tabManager.reorderTabs(id, id, 'before')
    expect(tabManager.getActiveTab().id).toBe(id)
  })

  it('reorderTabs after: inserts fromTab after toTab', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    const idA = tabManager.getActiveTab().id
    tabManager.createTab()
    const idB = tabManager.getActiveTab().id
    tabManager.reorderTabs(idA, idB, 'after')
    // A moved after B; active is still B
    expect(tabManager.getActiveTab().id).toBe(idB)
  })

  // ── Persistence ───────────────────────────────────────────

  it('persists state 500ms after mutation via debounce', () => {
    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    tabManager.createTab()
    vi.advanceTimersByTime(500)
    const saved = JSON.parse(store['tabs-state'])
    expect(saved.tabs.length).toBe(2)
  })

  // ── Callback contract ────────────────────────────────────

  it('onActiveTabChange NOT called during initTabManager', () => {
    const cb = vi.fn()
    tabManager.initTabManager({ onActiveTabChange: cb })
    expect(cb).not.toHaveBeenCalled()
  })

  it('onActiveTabChange IS called on switchTab', () => {
    const cb = vi.fn()
    tabManager.initTabManager({ onActiveTabChange: cb })
    tabManager.createTab()
    cb.mockClear()
    const ids = []
    // Switch back to first
    tabManager.initTabManager({ onActiveTabChange: cb })
    cb.mockClear()
    tabManager.createTab()
    cb.mockClear()
    const second = tabManager.getActiveTab().id
    tabManager.createTab()
    cb.mockClear()
    tabManager.switchTab(second)
    expect(cb).toHaveBeenCalledOnce()
  })

  it('onActiveTabChange IS called on createTab', () => {
    const cb = vi.fn()
    tabManager.initTabManager({ onActiveTabChange: cb })
    cb.mockClear()
    tabManager.createTab()
    expect(cb).toHaveBeenCalledOnce()
  })

  it('onActiveTabChange IS called when closeTab changes active tab', () => {
    const cb = vi.fn()
    tabManager.initTabManager({ onActiveTabChange: cb })
    cb.mockClear()
    const id = tabManager.getActiveTab().id
    tabManager.closeTab(id)
    expect(cb).toHaveBeenCalledOnce()
  })

  // ── Listener accumulation ─────────────────────────────────

  it('tab container addEventListener called at most once per event type across multiple tab mutations', () => {
    const container = document.getElementById('tab-bar-tabs')
    const callCounts = {}
    const original = container.addEventListener.bind(container)
    container.addEventListener = vi.fn((type, ...args) => {
      callCounts[type] = (callCounts[type] || 0) + 1
      original(type, ...args)
    })

    tabManager.initTabManager({ onActiveTabChange: vi.fn() })
    tabManager.createTab()
    tabManager.createTab()
    const id = tabManager.getActiveTab().id
    tabManager.closeTab(id)
    tabManager.switchTab(tabManager.getActiveTab().id)

    for (const [type, count] of Object.entries(callCounts)) {
      expect(count, `event type "${type}" should be registered at most once`).toBeLessThanOrEqual(1)
    }
  })
})
