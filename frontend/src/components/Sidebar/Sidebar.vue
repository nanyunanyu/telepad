<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import {
  Database,
  Download,
  Edit3,
  Hash,
  Menu,
  Moon,
  Pin,
  PinOff,
  Plus,
  Search,
  Send,
  Sun,
  Trash2,
  X,
} from 'lucide-vue-next';
import type { Notebook, SearchResultItem, TagSummary, ThemeMode } from '../../types';
import NotebookItem from './NotebookItem.vue';
import SearchResults from './SearchResults.vue';

const props = defineProps<{
  notebooks: Notebook[];
  activeNotebookId: string;
  tags: TagSummary[];
  activeTag: string | null;
  theme: ThemeMode;
  globalSearchQuery: string;
  globalSearchLoading: boolean;
  globalSearchResults: SearchResultItem[];
  mobileOpen: boolean;
}>();

const emit = defineEmits<{
  selectNotebook: [id: string];
  selectTag: [tag: string | null];
  'update:globalSearchQuery': [query: string];
  selectSearchResult: [result: SearchResultItem];
  toggleTheme: [];
  openNewNotebook: [];
  editNotebook: [notebook: Notebook];
  togglePinNotebook: [notebook: Notebook];
  exportNotebook: [notebook: Notebook];
  deleteNotebook: [notebook: Notebook];
  openBackupModal: [];
  closeMobile: [];
}>();

const menuOpen = ref(false);
const ctxMenu = ref<{ x: number; y: number; notebook: Notebook } | null>(null);
const menuRef = ref<HTMLDivElement | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);

const isSearching = computed(() => props.globalSearchQuery.trim().length > 0);
const visibleTags = computed(() => props.tags.slice(0, 18));

const closeAll = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false;
  }
  ctxMenu.value = null;
};

onMounted(() => {
  window.addEventListener('click', closeAll);
});

onUnmounted(() => {
  window.removeEventListener('click', closeAll);
});

const handleNotebookContextMenu = (e: MouseEvent, notebook: Notebook) => {
  e.preventDefault();
  e.stopPropagation();
  const x = Math.min(e.clientX, window.innerWidth - 210);
  const y = Math.min(e.clientY, window.innerHeight - 210);
  ctxMenu.value = { x, y, notebook };
};

const isTagActive = (tag: string) =>
  props.activeTag?.toLowerCase() === tag.toLowerCase();

const focusSearch = () => {
  searchInputRef.value?.focus();
  searchInputRef.value?.select();
};

defineExpose({ focusSearch });
</script>

<template>
  <div
    v-if="mobileOpen"
    class="modal-backdrop"
    style="z-index: 18"
    aria-hidden="true"
    @click="emit('closeMobile')"
  />

  <aside :class="['sidebar', { 'mobile-open': mobileOpen }]">
    <div ref="menuRef" class="sidebar-top">
      <button
        type="button"
        :class="['icon-btn', { active: menuOpen }]"
        title="菜单与设置"
        aria-label="打开菜单"
        @click.stop="menuOpen = !menuOpen"
      >
        <Menu :size="20" />
      </button>

      <div class="search-box">
        <Search :size="16" class="search-box-icon" />
        <input
          ref="searchInputRef"
          type="text"
          :value="globalSearchQuery"
          placeholder="全局搜索笔记 (⌘K)"
          aria-label="全局搜索笔记"
          @input="emit('update:globalSearchQuery', ($event.target as HTMLInputElement).value)"
        />
        <button
          v-if="globalSearchQuery"
          type="button"
          class="search-clear-btn"
          title="清空搜索"
          aria-label="清空搜索"
          @click="emit('update:globalSearchQuery', '')"
        >
          <X :size="14" />
        </button>
      </div>

      <div v-if="menuOpen" class="sidebar-menu-popover" @click.stop>
        <div class="menu-brand">
          <div class="avatar-circle sm avatar-blue">
            <Send :size="17" />
          </div>
          <div>
            <div class="menu-brand-title">Telepad</div>
            <div class="menu-brand-sub">本地 SQLite · Markdown 镜像</div>
          </div>
        </div>

        <button
          type="button"
          class="menu-item"
          @click="
            emit('openNewNotebook');
            menuOpen = false;
          "
        >
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

        <button
          type="button"
          class="menu-item"
          @click="
            emit('openBackupModal');
            menuOpen = false;
          "
        >
          <span class="menu-item-left">
            <Database :size="16" />
            <span>数据备份与恢复</span>
          </span>
        </button>

        <div class="menu-divider" />
        <div
          style="padding: 6px 10px; font-size: 11.5px; color: var(--tg-text-secondary); line-height: 1.5"
        >
          <div>快捷键：`⌘/Ctrl + K` 全局搜索</div>
          <div>`⌘/Ctrl + F` 当前频道内搜索</div>
        </div>
      </div>
    </div>

    <!-- Tag Filter Strip -->
    <div v-if="!isSearching && tags.length > 0" class="sidebar-tags" aria-label="标签筛选">
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

    <div class="sidebar-scroll">
      <SearchResults
        v-if="isSearching"
        :query="globalSearchQuery.trim()"
        :loading="globalSearchLoading"
        :results="globalSearchResults"
        @select-result="
          (r) => {
            emit('selectSearchResult', r);
            emit('closeMobile');
          }
        "
      />
      <template v-else>
        <NotebookItem
          v-for="nb in notebooks"
          :key="nb.id"
          :notebook="nb"
          :active="nb.id === activeNotebookId"
          @select="
            (id) => {
              emit('selectNotebook', id);
              emit('closeMobile');
            }
          "
          @contextmenu="handleNotebookContextMenu"
        />
      </template>
    </div>

    <button
      type="button"
      class="fab-new-notebook"
      title="新建笔记本"
      aria-label="新建笔记本"
      @click="emit('openNewNotebook')"
    >
      <Plus :size="24" />
    </button>
  </aside>

  <div
    v-if="ctxMenu"
    class="context-menu"
    :style="{ left: `${ctxMenu.x}px`, top: `${ctxMenu.y}px` }"
    @click.stop
  >
    <button
      v-if="!ctxMenu.notebook.isSystem"
      type="button"
      class="menu-item"
      @click="
        emit('togglePinNotebook', ctxMenu.notebook);
        ctxMenu = null;
      "
    >
      <span class="menu-item-left">
        <PinOff v-if="ctxMenu.notebook.isPinned" :size="15" />
        <Pin v-else :size="15" />
        <span>{{ ctxMenu.notebook.isPinned ? '取消置顶频道' : '置顶频道' }}</span>
      </span>
    </button>

    <button
      type="button"
      class="menu-item"
      @click="
        emit('editNotebook', ctxMenu.notebook);
        ctxMenu = null;
      "
    >
      <span class="menu-item-left">
        <Edit3 :size="15" />
        <span>编辑笔记本信息</span>
      </span>
    </button>

    <button
      type="button"
      class="menu-item"
      @click="
        emit('exportNotebook', ctxMenu.notebook);
        ctxMenu = null;
      "
    >
      <span class="menu-item-left">
        <Download :size="15" />
        <span>导出整本 Markdown</span>
      </span>
    </button>

    <template v-if="!ctxMenu.notebook.isSystem">
      <div class="menu-divider" />
      <button
        type="button"
        class="menu-item danger"
        @click="
          emit('deleteNotebook', ctxMenu.notebook);
          ctxMenu = null;
        "
      >
        <span class="menu-item-left">
          <Trash2 :size="15" />
          <span>删除笔记本</span>
        </span>
      </button>
    </template>
  </div>
</template>
