<script setup lang="ts">
import { computed } from 'vue';
import { Hash } from 'lucide-vue-next';
import type { TagSummary } from '@/modules/notebooks/types';

const props = defineProps<{
  tags: TagSummary[];
  activeTag: string | null;
}>();

const emit = defineEmits<{
  selectTag: [tag: string | null];
}>();

const visibleTags = computed(() => props.tags.slice(0, 18));

const isTagActive = (tag: string) =>
  props.activeTag?.toLowerCase() === tag.toLowerCase();
</script>

<template>
  <div v-if="tags.length > 0" class="sidebar-tags" aria-label="标签筛选">
    <button
      type="button"
      :class="['tag-chip', { active: activeTag === null }]"
      @click="emit('selectTag', null)"
    >
      <span>全部</span>
    </button>
    <button
      v-for="t in visibleTags"
      :key="t.tag"
      type="button"
      :class="['tag-chip', { active: isTagActive(t.tag) }]"
      @click="emit('selectTag', isTagActive(t.tag) ? null : t.tag)"
    >
      <Hash :size="11" />
      <span>{{ t.tag }}</span>
      <span class="tag-chip-count">{{ t.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.sidebar-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px 10px;
  overflow-x: auto;
  flex-shrink: 0;
  border-bottom: 1px solid var(--tg-border-subtle);
}

.sidebar-tags::-webkit-scrollbar {
  height: 3px;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  background: var(--tg-tag-bg);
  color: var(--tg-tag-text);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tag-chip:hover {
  background: var(--tg-tag-hover);
}

.tag-chip.active {
  background: var(--tg-accent);
  color: #ffffff;
}

.tag-chip-count {
  font-size: 11px;
  opacity: 0.78;
}
</style>
