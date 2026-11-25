<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ChevronDown, ChevronUp, X } from 'lucide-vue-next';

defineProps<{
  query: string;
  matchCount: number;
  currentMatchIndex: number;
}>();

const emit = defineEmits<{
  'update:query': [query: string];
  prev: [];
  next: [];
  close: [];
}>();

const inputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  inputRef.value?.focus();
  inputRef.value?.select();
});

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    if (e.shiftKey) emit('prev');
    else emit('next');
  } else if (e.key === 'Escape') {
    emit('close');
  }
};
</script>

<template>
  <div class="inchat-search">
    <input
      ref="inputRef"
      type="text"
      class="inchat-search-input"
      :value="query"
      placeholder="在当前笔记本内搜索关键词..."
      aria-label="频道内搜索"
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      @keydown="handleKeyDown"
    />
    <span class="inchat-search-counter">
      <template v-if="query.trim()">
        {{ matchCount > 0 ? `${currentMatchIndex + 1} / ${matchCount}` : '0 / 0' }}
      </template>
    </span>
    <button
      type="button"
      class="icon-btn sm"
      :disabled="matchCount === 0"
      title="上一条匹配 (Shift+Enter)"
      aria-label="上一条匹配"
      @click="emit('prev')"
    >
      <ChevronUp :size="18" />
    </button>
    <button
      type="button"
      class="icon-btn sm"
      :disabled="matchCount === 0"
      title="下一条匹配 (Enter)"
      aria-label="下一条匹配"
      @click="emit('next')"
    >
      <ChevronDown :size="18" />
    </button>
    <button
      type="button"
      class="icon-btn sm"
      title="关闭搜索 (Esc)"
      aria-label="关闭搜索"
      @click="emit('close')"
    >
      <X :size="18" />
    </button>
  </div>
</template>
