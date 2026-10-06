<script setup lang="ts">
import type { IconName } from '~/utils/icons'

defineProps<{ name: IconName }>()
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -- tracés statiques de utils/icons.ts -->
  <svg
    class="icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    v-html="ICON_PATHS[name]"
  />
</template>
