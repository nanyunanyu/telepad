<script setup lang="ts">
import { Download, Menu, Moon, Pin, Search, Settings2, Sun } from 'lucide-vue-next';
import { useTheme } from '@/core/composables/useTheme';
import { useUiStore } from '@/core/stores/useUiStore';
import Avatar from '@/shared/components/Avatar.vue';
import { notebooksApi } from '@/modules/notebooks/api/notebooksApi';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';

const ui = useUiStore();
const notebookStore = useNotebookStore();
const noteStore = useNoteStore();
const searchStore = useSearchStore();
const { theme, toggleTheme } = useTheme();

const exportCurrentNotebook = () => {
  if (notebookStore.activeNotebook) {
    window.location.href = notebooksApi.getExportUrl(notebookStore.activeNotebook.id);
  }
};

const editCurrentNotebook = () => {
  if (notebookStore.activeNotebook) {
    notebookStore.openEditModal(notebookStore.activeNotebook);
  }
};
</script>

<template>
  <header v-if="notebookStore.activeNotebook" class="chat-header">
    <div class="chat-header-left">
      <button
        type="button"
        class="icon-btn mobile-menu-btn"
        aria-label="展开笔记本列表"
        @click="ui.openMobileSidebar()"
      >
        <Menu :size="20" />
      </button>

      <Avatar
        :icon="notebookStore.activeNotebook.icon"
        :color="notebookStore.activeNotebook.avatarColor"
        size="sm"
      />

      <div class="chat-header-info">
        <div class="chat-header-title-row">
          <span class="chat-header-title">{{ notebookStore.activeNotebook.name }}</span>
        </div>
        <span class="chat-header-sub">
          {{ notebookStore.activeNotebook.noteCount }} 条笔记{{
            notebookStore.activeNotebook.description
              ? ` · ${notebookStore.activeNotebook.description}`
              : ''
          }}
        </span>
      </div>
    </div>

    <div class="chat-header-actions">
      <button
        type="button"
        :class="['icon-btn', { active: searchStore.inChatSearchOpen }]"
        title="在当前笔记本中搜索 (⌘F)"
        aria-label="在当前笔记本中搜索"
        @click="searchStore.toggleInChatSearch()"
      >
        <Search :size="19" />
      </button>

      <button
        type="button"
        :class="['icon-btn', { active: noteStore.pinnedOnly }]"
        :title="noteStore.pinnedOnly ? '显示全部笔记' : '仅看置顶笔记'"
        aria-label="筛选置顶笔记"
        @click="noteStore.togglePinnedOnly()"
      >
        <Pin :size="19" />
      </button>

      <button
        type="button"
        class="icon-btn"
        title="导出当前笔记本为 Markdown (.md)"
        aria-label="导出笔记本 Markdown"
        @click="exportCurrentNotebook"
      >
        <Download :size="19" />
      </button>

      <button
        type="button"
        class="icon-btn"
        title="编辑笔记本信息"
        aria-label="编辑笔记本"
        @click="editCurrentNotebook"
      >
        <Settings2 :size="19" />
      </button>

      <button
        type="button"
        class="icon-btn"
        :title="theme === 'day' ? '切换至 Telegram 夜间主题 (Night)' : '切换至 Telegram 日间主题 (Day)'"
        aria-label="切换明暗主题"
        @click="toggleTheme"
      >
        <Moon v-if="theme === 'day'" :size="19" />
        <Sun v-else :size="19" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.chat-header {
  height: var(--header-height);
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: var(--tg-bg-surface);
  border-bottom: 1px solid var(--tg-border);
  z-index: 15;
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
}

.mobile-menu-btn {
  display: none;
}

.chat-header-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.chat-header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-header-title {
  font-size: 15.5px;
  font-weight: 600;
  color: var(--tg-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-header-sub {
  font-size: 12.5px;
  color: var(--tg-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .mobile-menu-btn {
    display: inline-flex;
  }
}
</style>
