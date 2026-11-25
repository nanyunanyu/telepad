<script setup lang="ts">
import { Download, Menu, Moon, Pin, Search, Settings2, Sun } from 'lucide-vue-next';
import type { Notebook, ThemeMode } from '../../types';
import Avatar from '../Common/Avatar.vue';

defineProps<{
  notebook: Notebook | null;
  theme: ThemeMode;
  inChatSearchOpen: boolean;
  pinnedOnly: boolean;
}>();

const emit = defineEmits<{
  openMobileSidebar: [];
  toggleInChatSearch: [];
  togglePinnedOnly: [];
  exportNotebook: [];
  editNotebook: [];
  toggleTheme: [];
}>();
</script>

<template>
  <header v-if="notebook" class="chat-header">
    <div class="chat-header-left">
      <button
        type="button"
        class="icon-btn mobile-menu-btn"
        aria-label="展开笔记本列表"
        @click="emit('openMobileSidebar')"
      >
        <Menu :size="20" />
      </button>

      <Avatar :icon="notebook.icon" :color="notebook.avatarColor" size="sm" />

      <div class="chat-header-info">
        <div class="chat-header-title-row">
          <span class="chat-header-title">{{ notebook.name }}</span>
        </div>
        <span class="chat-header-sub">
          {{ notebook.noteCount }} 条笔记{{ notebook.description ? ` · ${notebook.description}` : '' }}
        </span>
      </div>
    </div>

    <div class="chat-header-actions">
      <button
        type="button"
        :class="['icon-btn', { active: inChatSearchOpen }]"
        title="在当前笔记本中搜索 (⌘F)"
        aria-label="在当前笔记本中搜索"
        @click="emit('toggleInChatSearch')"
      >
        <Search :size="19" />
      </button>

      <button
        type="button"
        :class="['icon-btn', { active: pinnedOnly }]"
        :title="pinnedOnly ? '显示全部笔记' : '仅看置顶笔记'"
        aria-label="筛选置顶笔记"
        @click="emit('togglePinnedOnly')"
      >
        <Pin :size="19" />
      </button>

      <button
        type="button"
        class="icon-btn"
        title="导出当前笔记本为 Markdown (.md)"
        aria-label="导出笔记本 Markdown"
        @click="emit('exportNotebook')"
      >
        <Download :size="19" />
      </button>

      <button
        type="button"
        class="icon-btn"
        title="编辑笔记本信息"
        aria-label="编辑笔记本"
        @click="emit('editNotebook')"
      >
        <Settings2 :size="19" />
      </button>

      <button
        type="button"
        class="icon-btn"
        :title="theme === 'day' ? '切换至 Telegram 夜间主题 (Night)' : '切换至 Telegram 日间主题 (Day)'"
        aria-label="切换明暗主题"
        @click="emit('toggleTheme')"
      >
        <Moon v-if="theme === 'day'" :size="19" />
        <Sun v-else :size="19" />
      </button>
    </div>
  </header>
</template>
