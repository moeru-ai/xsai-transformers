<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'

const isDark = useDark()
const toggleDark = useToggle(isDark)
</script>

<template>
  <div mx-auto max-w-screen-lg flex flex-col gap-2 p-4>
    <header flex flex-row items-center justify-between>
      <h1 text-2xl>
        <a href="https://github.com/moeru-ai/xsai">xsAI</a> + <a href="https://huggingface.co/docs/transformers.js/index">🤗 Transformers.js</a> Provider Playground
      </h1>
      <div flex flex-row items-center gap-2>
        <button text-lg @click="() => toggleDark()">
          <div v-if="isDark" i-solar:moon-stars-bold-duotone />
          <div v-else i-solar:sun-bold />
        </button>
        <a href="https://github.com/moeru-ai/xsai-transformers">
          <div i-simple-icons:github />
        </a>
      </div>
    </header>
    <nav bg="neutral-100 dark:neutral-800" w-fit flex items-center of-hidden rounded-lg>
      <RouterLink
        to="/" px-3 py-2 bg="hover:neutral-200 dark:hover:neutral-700"
        transition="all duration-250 ease-in-out"
      >
        <h1>Embedding</h1>
      </RouterLink>
      <div bg="neutral-200 dark:neutral-600" h="1lh" w="0.5" />
      <RouterLink
        to="/transcription" px-3 py-2 bg="hover:neutral-200 dark:hover:neutral-700"
        transition="all duration-250 ease-in-out"
      >
        <h1>Transcription</h1>
      </RouterLink>
      <div bg="neutral-200 dark:neutral-600" h="1lh" w="0.5" />
      <RouterLink
        to="/speech" px-3 py-2 bg="hover:neutral-200 dark:hover:neutral-700"
        transition="all duration-250 ease-in-out"
      >
        <h1>Speech</h1>
      </RouterLink>
    </nav>
    <RouterView />
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  overscroll-behavior: none;
}

html {
  background: #fff;
  transition: all 0.3s ease-in-out;
}

html.dark {
  background: #121212;
  color-scheme: dark;
}
</style>
