import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'

import DomainNavItem from './vue/DomainNavItem.vue'
import { DOMAIN_NAV_COMPONENT } from '../nav-adapter'
import SidebarLayout from './vue/SidebarLayout.vue'

import './styles/tokens.css'
import './styles/default-theme.css'
import { FIREWORKS_TARGET_SELECTOR } from './default-theme-selectors'

const BURST_CLASS = 'is-bursting'

// Replay fireworks burst reliably on every click even during rapid clicks
function bindIconFireworksBurst(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const w = window as typeof window & { __atmFireworksBound?: boolean }
  if (w.__atmFireworksBound) return
  w.__atmFireworksBound = true

  const timers = new WeakMap<Element, number>()
  document.addEventListener('click', (event) => {
    const target =
      event.target instanceof Element ? event.target.closest(FIREWORKS_TARGET_SELECTOR) : null
    if (!target) return

    target.classList.remove(BURST_CLASS)
    // Force layout reflow so re-adding the class restarts the CSS keyframe animation cleanly
    void (target as HTMLElement).offsetWidth
    target.classList.add(BURST_CLASS)

    window.clearTimeout(timers.get(target))
    const duration = getComputedStyle(target)
      .getPropertyValue('--atm-icon-click-flash-duration')
      .trim()
    const match = /^(\d*\.?\d+)(ms|s)$/.exec(duration)
    const milliseconds = match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : 450
    timers.set(
      target,
      window.setTimeout(() => {
        target.classList.remove(BURST_CLASS)
        timers.delete(target)
      }, milliseconds)
    )
  })
}

const theme: Theme = {
  extends: DefaultTheme,
  Layout: SidebarLayout,
  enhanceApp({ app }) {
    app.component(DOMAIN_NAV_COMPONENT, DomainNavItem)
    bindIconFireworksBurst()
  }
}

export default theme
