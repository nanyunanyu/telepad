<script setup lang="ts">
import { Pin } from 'lucide-vue-next';
import type { SearchResultItem } from '../../types';
import { formatSidebarTime } from '../../utils/formatTime';
import Avatar from '../Common/Avatar.vue';
import HighlightText from '../Common/HighlightText.vue';

defineProps<{
  query: string;
  loading: boolean;
  results: SearchResultItem[];
}>();

const emit = defineEmits<{
  selectResult: [result: SearchResultItem];
}>();
</script>

<template>
  <div v-if="loading" class="sidebar-section-label">
    <span>正在搜索 “{{ query }}”...</span>
  </div>
  <div v-else>
    <div class="sidebar-section-label">
      <span>全局搜索结果</span>
      <span>{{ results.length }} 条</span>
    </div>
    <div
      v-if="results.length === 0"
      style="padding: 28px 16px; text-align: center; color: var(--tg-text-secondary); font-size: 13px"
    >
      未找到包含 “{{ query }}” 的笔记
    </div>
    <template v-else>
      <button
        v-for="item in results"
        :key="item.id"
        type="button"
        class="search-result-item"
        @click="emit('selectResult', item)"
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
            <span class="notebook-item-time">{{ formatSidebarTime(item.createdAt) }}</span>
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
