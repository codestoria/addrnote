<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
import { computed } from 'vue'

import { isIndexDocument } from '../page-layout'

const { page } = useData()
const hideAside = computed(() => isIndexDocument(page.value.filePath))
</script>

<template>
  <div class="addrnote-layout" :class="{ 'addrnote-index-page': hideAside }">
    <DefaultTheme.Layout />
  </div>
</template>
