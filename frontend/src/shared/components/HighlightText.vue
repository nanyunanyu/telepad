<script setup lang="ts">
import { computed } from 'vue';
import { escapeRegex } from '@/shared/utils/formatTime';

const props = defineProps<{
  text: string;
  query: string;
}>();

const segments = computed(() => {
  const trimmed = props.query.trim();
  if (!trimmed) return [{ text: props.text, match: false }];
  const regex = new RegExp(`(${escapeRegex(trimmed)})`, 'gi');
  const lower = trimmed.toLowerCase();
  return props.text.split(regex).map((part) => ({
    text: part,
    match: part.toLowerCase() === lower,
  }));
});
</script>

<template>
  <template v-for="(seg, idx) in segments" :key="idx">
    <mark v-if="seg.match" class="search-mark">{{ seg.text }}</mark>
    <span v-else>{{ seg.text }}</span>
  </template>
</template>
