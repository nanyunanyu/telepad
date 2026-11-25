<script setup lang="ts">
import { Database, Moon, Plus, Send, Sun } from 'lucide-vue-next';
import Avatar from '@/shared/components/Avatar.vue';
import type { ThemeMode } from '@/core/types/common';

defineProps<{
  theme: ThemeMode;
}>();

const emit = defineEmits<{
  newNotebook: [];
  toggleTheme: [];
  openBackup: [];
}>();
</script>

<template>
  <div class="sidebar-menu-popover" @click.stop>
    <div class="menu-brand">
      <Avatar color="blue" size="sm">
        <Send :size="17" />
      </Avatar>
      <div>
        <div class="menu-brand-title">Telepad</div>
        <div class="menu-brand-sub">本地 SQLite · Markdown 镜像</div>
      </div>
    </div>

    <button type="button" class="menu-item" @click="emit('newNotebook')">
      <span class="menu-item-left">
        <Plus :size="16" />
        <span>新建笔记本频道</span>
      </span>
    </button>

    <button type="button" class="menu-item" @click="emit('toggleTheme')">
      <span class="menu-item-left">
        <Moon v-if="theme === 'night'" :size="16" />
        <Sun v-else :size="16" />
        <span>夜间模式 (Night)</span>
      </span>
      <span :class="['theme-pill-switch', { on: theme === 'night' }]" />
    </button>

    <button type="button" class="menu-item" @click="emit('openBackup')">
      <span class="menu-item-left">
        <Database :size="16" />
        <span>数据备份与恢复</span>
      </span>
    </button>

    <div class="menu-divider" />
    <div class="shortcut-hints">
      <div>快捷键：`⌘/Ctrl + K` 全局搜索</div>
      <div>`⌘/Ctrl + F` 当前频道内搜索</div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-menu-popover {
  position: absolute;
  top: 56px;
  left: 12px;
  width: 248px;
  background: var(--tg-menu-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--tg-border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--tg-menu-shadow);
  padding: 6px;
  z-index: 60;
  animation: fadeSlideDown 0.14s ease;
}

.menu-brand {
  padding: 10px 10px 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid var(--tg-border-subtle);
  margin-bottom: 4px;
}

.menu-brand-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--tg-text-primary);
}

.menu-brand-sub {
  font-size: 11.5px;
  color: var(--tg-text-secondary);
}

.theme-pill-switch {
  width: 34px;
  height: 19px;
  border-radius: 999px;
  background: var(--tg-border);
  position: relative;
  transition: background-color 0.2s ease;
}

.theme-pill-switch.on {
  background: var(--tg-accent);
}

.theme-pill-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #ffffff;
  transition: transform 0.2s ease;
}

.theme-pill-switch.on::after {
  transform: translateX(15px);
}

.shortcut-hints {
  padding: 6px 10px;
  font-size: 11.5px;
  color: var(--tg-text-secondary);
  line-height: 1.5;
}
</style>
