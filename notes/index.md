---
layout: false
title: Addrnote｜址笺
description: Locate every piece of knowledge.
---

<script setup>
import { onMounted } from 'vue'
import { useRouter, withBase } from 'vitepress'

const router = useRouter()

onMounted(() => {
  const lang = (navigator.language || navigator.userLanguage || '').toLowerCase()
  const target = lang.startsWith('zh') ? '/zh/' : '/en/'
  router.go(withBase(target))
})
</script>

<div style="text-align: center; padding: 4rem 1rem; font-family: sans-serif;">
  <p>正在根据您的语言偏好跳转 / Redirecting based on your language...</p>
  <p style="margin-top: 1rem;">
    <a :href="withBase('/zh/')">简体中文</a> &nbsp;|&nbsp; <a :href="withBase('/en/')">English</a>
  </p>
</div>
