<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ChevronDown, ChevronUp, X } from 'lucide-vue-next';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';

const searchStore = useSearchStore();
const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  inputRef.value?.focus();
  inputRef.value?.select();
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) searchStore.prevMatch();
    else searchStore.nextMatch();
  } else if (e.key === 'Escape') {
    searchStore.closeInChatSearch();
  }
};
</script>

<template>
  <div class="inchat-search">
    <input
      ref="inputRef"
      v-model="searchStore.inChatQuery"
      type="text"
      class="inchat-search-input"
      placeholder="在当前笔记本内搜索关键词..."
      aria-label="频道内搜索"
      @keydown="handleKeyDown"
    />
    <span class="inchat-search-counter">
      <template v-if="searchStore.inChatQuery.trim()">
        {{
          searchStore.inChatMatches.length > 0
            ? `${searchStore.inChatMatchIdx + 1} / ${searchStore.inChatMatches.length}`
            : '0 / 0'
        }}
      </template>
    </span>
    <button
      type="button"
      class="icon-btn sm"
      :disabled="searchStore.inChatMatches.length === 0"
      title="上一条匹配 (Shift+Enter)"
      aria-label="上一条匹配"
      @click="searchStore.prevMatch()"
    >
      <ChevronUp :size="18" />
    </button>
    <button
      type="button"
      class="icon-btn sm"
      :disabled="searchStore.inChatMatches.length === 0"
      title="下一条匹配 (Enter)"
      aria-label="下一条匹配"
      @click="searchStore.nextMatch()"
    >
      <ChevronDown :size="18" />
    </button>
    <button
      type="button"
      class="icon-btn sm"
      title="关闭搜索 (Esc)"
      aria-label="关闭搜索"
      @click="searchStore.closeInChatSearch()"
    >
      <X :size="18" />
    </button>
  </div>
</template>

<style scoped>
.inchat-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--tg-bg-surface);
  border-bottom: 1px solid var(--tg-border);
  z-index: 14;
  animation: fadeSlideDown 0.14s ease;
}

.inchat-search-input {
  flex: 1;
  height: 34px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  border: 1.5px solid var(--tg-accent);
  background: var(--tg-bg-input);
  outline: none;
  font-size: 13.5px;
}

.inchat-search-counter {
  font-size: 12.5px;
  color: var(--tg-text-secondary);
  min-width: 52px;
  text-align: center;
}
</style>
