// src/mobileNav.js
const BREAKPOINT = 768

const tabs = document.querySelectorAll('.mobile-tab')
const editorPane = document.getElementById('editor-pane')
const previewPane = document.getElementById('preview-pane')
const sidebar = document.getElementById('sidebar')

function showPane(pane) {
  editorPane.classList.remove('pane--active')
  previewPane.classList.remove('pane--active')
  sidebar.classList.remove('mobile-style-open')

  if (pane === 'editor') editorPane.classList.add('pane--active')
  else if (pane === 'preview') previewPane.classList.add('pane--active')
  else if (pane === 'style') sidebar.classList.add('mobile-style-open')

  tabs.forEach((tab) => {
    tab.classList.toggle('mobile-tab--active', tab.dataset.pane === pane)
  })
}

export function initMobileNav() {
  if (window.innerWidth > BREAKPOINT) return

  showPane('editor')

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => showPane(tab.dataset.pane))
  })
}
