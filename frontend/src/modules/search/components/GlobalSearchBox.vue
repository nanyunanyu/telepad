<script setup lang="ts">
import { ref } from 'vue';
import { Search, X } from 'lucide-vue-next';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';

const searchStore = useSearchStore();
const inputRef = ref<HTMLInputElement | null>(null);

const focus = () => {
  inputRef.value?.focus();
  inputRef.value?.select();
};

defineExpose({ focus });
</script>

<template>
  <div class="search-box">
    <Search :size="16" class="search-box-icon" />
    <input
      ref="inputRef"
      v-model="searchStore.globalSearchQuery"
      type="text"
      placeholder="全局搜索笔记 (⌘K)"
      aria-label="全局搜索笔记"
    />
    <button
      v-if="searchStore.globalSearchQuery"
      type="button"
      class="search-clear-btn"
      title="清空搜索"
      aria-label="清空搜索"
      @click="searchStore.clearGlobalSearch()"
    >
      <X :size="14" />
    </button>
  </div>
</template>

<style scoped>
.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 12px;
  border-radius: var(--radius-pill);
  background: var(--tg-bg-input);
  border: 1.5px solid transparent;
  transition: border-color 0.16s ease, background-color 0.16s ease;
}

.search-box:focus-within {
  background: var(--tg-bg-surface);
  border-color: var(--tg-accent);
}

.search-box-icon {
  color: var(--tg-text-secondary);
  flex-shrink: 0;
}

.search-box input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13.5px;
  color: var(--tg-text-primary);
}

.search-box input::placeholder {
  color: var(--tg-text-muted);
}

.search-clear-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--tg-text-secondary);
}

.search-clear-btn:hover {
  background: var(--tg-bg-hover);
  color: var(--tg-text-primary);
}
</style>
