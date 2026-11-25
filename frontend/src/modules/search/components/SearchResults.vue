<script setup lang="ts">
import { computed } from 'vue';
import { Pin } from 'lucide-vue-next';
import { useWorkspaceCoordinator } from '@/core/composables/useWorkspaceCoordinator';
import { useUiStore } from '@/core/stores/useUiStore';
import Avatar from '@/shared/components/Avatar.vue';
import HighlightText from '@/shared/components/HighlightText.vue';
import { formatSidebarTime } from '@/shared/utils/formatTime';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';
import type { SearchResultItem } from '@/modules/search/types';

const searchStore = useSearchStore();
const ui = useUiStore();
const coordinator = useWorkspaceCoordinator();

const query = computed(() => searchStore.globalSearchQuery.trim());

const handleSelect = (item: SearchResultItem) => {
  coordinator.selectSearchResult(item);
  ui.closeMobileSidebar();
};
</script>

<template>
  <div v-if="searchStore.globalSearchLoading" class="sidebar-section-label">
    <span>正在搜索 “{{ query }}”...</span>
  </div>
  <div v-else>
    <div class="sidebar-section-label">
      <span>全局搜索结果</span>
      <span>{{ searchStore.globalSearchResults.length }} 条</span>
    </div>
    <div v-if="searchStore.globalSearchResults.length === 0" class="search-empty">
      未找到包含 “{{ query }}” 的笔记
    </div>
    <template v-else>
      <button
        v-for="item in searchStore.globalSearchResults"
        :key="item.id"
        type="button"
        class="search-result-item"
        @click="handleSelect(item)"
      >
        <Avatar :icon="item.notebookIcon" :color="item.notebookAvatarColor" size="sm" />
        <div class="search-result-body">
          <div class="search-result-head">
            <span class="search-result-channel">
              {{ item.notebookName }}
              <Pin
                v-if="item.isPinned"
                :size="11"
                style="margin-left: 5px; vertical-align: -1px; opacity: 0.7"
              />
            </span>
            <span class="search-result-time">{{ formatSidebarTime(item.createdAt) }}</span>
          </div>
          <div class="search-result-snippet">
            <template v-if="item.hasImages">🖼️ </template>
            <HighlightText :text="item.snippet || '[图片笔记]'" :query="query" />
          </div>
        </div>
      </button>
    </template>
  </div>
</template>

<style scoped>
.sidebar-section-label {
  padding: 8px 10px 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tg-text-secondary);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.search-empty {
  padding: 28px 16px;
  text-align: center;
  color: var(--tg-text-secondary);
  font-size: 13px;
}

.search-result-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border-radius: var(--radius-md);
  text-align: left;
  transition: background-color 0.12s ease;
}

.search-result-item:hover {
  background: var(--tg-bg-hover);
}

.search-result-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.search-result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.search-result-channel {
  font-size: 13px;
  font-weight: 600;
  color: var(--tg-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-time {
  font-size: 11.5px;
  color: var(--tg-text-secondary);
  flex-shrink: 0;
}

.search-result-snippet {
  font-size: 12.5px;
  color: var(--tg-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}
</style>
