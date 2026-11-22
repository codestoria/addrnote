<script setup lang="ts">
import { withBase } from 'vitepress'
import { ref } from 'vue'

defineProps<{
  text: string
  link: string
  items: Array<{ text: string; link: string }>
  screenMenu?: boolean
}>()

const open = ref(false)
const toggle = ref<HTMLButtonElement | null>(null)

function closeOnFocusLeave(event: FocusEvent) {
  if (!(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null))
    open.value = false
}

function closeOnMouseLeave(event: MouseEvent) {
  if (!(event.currentTarget as HTMLElement).contains(document.activeElement)) open.value = false
}

function closeOnEscape() {
  if (!open.value) return
  open.value = false
  toggle.value?.focus()
}
</script>

<template>
  <!-- Mobile / screen drawer layout -->
  <div v-if="screenMenu" class="domain-nav-screen">
    <a class="domain-nav-screen-title" :href="withBase(link)">{{ text }}</a>
    <a
      v-for="item in items"
      :key="item.link"
      class="domain-nav-screen-item"
      :href="withBase(item.link)"
    >
      {{ item.text }}
    </a>
  </div>

  <!-- Desktop dropdown layout -->
  <div
    v-else
    class="domain-nav-item"
    @mouseenter="open = true"
    @mouseleave="closeOnMouseLeave"
    @focusout="closeOnFocusLeave"
    @keydown.esc="closeOnEscape"
  >
    <a class="domain-nav-title" :href="withBase(link)">
      <span>{{ text }}</span>
    </a>
    <button
      ref="toggle"
      type="button"
      class="domain-nav-toggle"
      :aria-label="text"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span class="vpi-chevron-down domain-nav-chevron" aria-hidden="true" />
    </button>
    <div v-show="open" class="domain-nav-menu">
      <div class="domain-nav-menu-content">
        <a
          v-for="item in items"
          :key="item.link"
          class="domain-nav-menu-item"
          :href="withBase(item.link)"
        >
          {{ item.text }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.domain-nav-item {
  position: relative;
  display: flex;
  align-items: center;
}

.domain-nav-title {
  display: flex;
  align-items: center;
  padding: 0 4px 0 12px;
  height: var(--vp-nav-height);
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 500;
  transition: color 0.25s;
}

.domain-nav-title:hover,
.domain-nav-title:focus-visible {
  color: var(--vp-c-brand-1);
}

.domain-nav-chevron {
  font-size: 14px;
}

.domain-nav-toggle {
  padding: 8px;
  color: var(--vp-c-text-1);
  cursor: pointer;
}

.domain-nav-toggle:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}

.domain-nav-menu {
  position: absolute;
  top: calc(var(--vp-nav-height) / 2 + 20px);
  right: 0;
  min-width: 128px;
  padding-top: 8px;
}

.domain-nav-menu-content {
  padding: 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background: var(--vp-c-bg-elv);
  box-shadow: var(--vp-shadow-3);
}

.domain-nav-menu-item {
  display: block;
  padding: 0 12px;
  border-radius: 6px;
  line-height: 32px;
  color: var(--vp-c-text-1);
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.domain-nav-menu-item:hover,
.domain-nav-menu-item:focus-visible {
  color: var(--vp-c-brand-1);
  background: var(--vp-c-default-soft);
}

.domain-nav-screen {
  padding: 10px 0;
  border-bottom: 1px solid var(--vp-c-divider);
}

.domain-nav-screen-title,
.domain-nav-screen-item {
  display: block;
  line-height: 32px;
  color: var(--vp-c-text-1);
  font-size: 14px;
}

.domain-nav-screen-title {
  font-weight: 600;
}

.domain-nav-screen-item {
  padding-left: 12px;
  color: var(--vp-c-text-2);
}

.domain-nav-screen-title:hover,
.domain-nav-screen-item:hover {
  color: var(--vp-c-brand-1);
}
</style>
