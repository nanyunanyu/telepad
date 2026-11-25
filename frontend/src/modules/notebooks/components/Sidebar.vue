<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { Download, Edit3, Menu, Pin, PinOff, Plus, Trash2 } from 'lucide-vue-next';
import { useTheme } from '@/core/composables/useTheme';
import { useWorkspaceCoordinator } from '@/core/composables/useWorkspaceCoordinator';
import { useUiStore } from '@/core/stores/useUiStore';
import { useContextMenu, type ContextMenuItem } from '@/shared/composables/useContextMenu';
import { useBackupStore } from '@/modules/backup/stores/useBackupStore';
import { notebooksApi } from '@/modules/notebooks/api/notebooksApi';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import type { Notebook } from '@/modules/notebooks/types';
import GlobalSearchBox from '@/modules/search/components/GlobalSearchBox.vue';
import SearchResults from '@/modules/search/components/SearchResults.vue';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';
import NotebookItem from './NotebookItem.vue';
import SidebarMenuPopover from './SidebarMenuPopover.vue';
import TagFilterRibbon from './TagFilterRibbon.vue';

const ui = useUiStore();
const notebookStore = useNotebookStore();
const searchStore = useSearchStore();
const backupStore = useBackupStore();
const coordinator = useWorkspaceCoordinator();
const { theme, toggleTheme } = useTheme();
const { openContextMenu } = useContextMenu();

const menuOpen = ref(false);
const menuRef = ref<HTMLDivElement | null>(null);
const searchBoxRef = ref<InstanceType<typeof GlobalSearchBox> | null>(null);

const isSearching = computed(() => searchStore.globalSearchQuery.trim().length > 0);
const activeNotebookId = computed(() => notebookStore.activeNotebook?.id ?? '');

const closePopoverOnOutsideClick = (e: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    menuOpen.value = false;
  }
};

onMounted(() => {
  window.addEventListener('click', closePopoverOnOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener('click', closePopoverOnOutsideClick);
});

const handleNotebookContextMenu = (e: MouseEvent, notebook: Notebook) => {
  const items: ContextMenuItem[] = [];
  if (!notebook.isSystem) {
    items.push({
      id: 'pin',
      label: notebook.isPinned ? '取消置顶频道' : '置顶频道',
      icon: notebook.isPinned ? PinOff : Pin,
      onSelect: () => void notebookStore.togglePinNotebook(notebook),
    });
  }
  items.push(
    {
      id: 'edit',
      label: '编辑笔记本信息',
      icon: Edit3,
      onSelect: () => notebookStore.openEditModal(notebook),
    },
    {
      id: 'export',
      label: '导出整本 Markdown',
      icon: Download,
      onSelect: () => {
        window.location.href = notebooksApi.getExportUrl(notebook.id);
      },
    }
  );
  if (!notebook.isSystem) {
    items.push({
      id: 'delete',
      label: '删除笔记本',
      icon: Trash2,
      danger: true,
      dividerBefore: true,
      onSelect: () => void coordinator.deleteNotebook(notebook),
    });
  }
  openContextMenu(e, items);
};

const handleSelectNotebook = (id: string) => {
  coordinator.selectNotebook(id);
  ui.closeMobileSidebar();
};

const focusSearch = () => {
  searchBoxRef.value?.focus();
};

defineExpose({ focusSearch });
</script>

<template>
  <div
    v-if="ui.mobileSidebarOpen"
    class="mobile-backdrop"
    aria-hidden="true"
    @click="ui.closeMobileSidebar()"
  />

  <aside :class="['sidebar', { 'mobile-open': ui.mobileSidebarOpen }]">
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

      <GlobalSearchBox ref="searchBoxRef" />

      <SidebarMenuPopover
        v-if="menuOpen"
        :theme="theme"
        @new-notebook="
          notebookStore.openCreateModal();
          menuOpen = false;
        "
        @toggle-theme="toggleTheme"
        @open-backup="
          backupStore.openModal();
          menuOpen = false;
        "
      />
    </div>

    <TagFilterRibbon
      v-if="!isSearching"
      :tags="notebookStore.tags"
      :active-tag="notebookStore.activeTag"
      @select-tag="notebookStore.setActiveTag"
    />

    <div class="sidebar-scroll">
      <SearchResults v-if="isSearching" />
      <template v-else>
        <NotebookItem
          v-for="nb in notebookStore.notebooks"
          :key="nb.id"
          :notebook="nb"
          :active="nb.id === activeNotebookId"
          @select="handleSelectNotebook"
          @contextmenu="handleNotebookContextMenu"
        />
      </template>
    </div>

    <button
      type="button"
      class="fab-new-notebook"
      title="新建笔记本"
      aria-label="新建笔记本"
      @click="notebookStore.openCreateModal()"
    >
      <Plus :size="24" />
    </button>
  </aside>
</template>

<style scoped>
.mobile-backdrop {
  position: fixed;
  inset: 0;
  background: var(--tg-modal-backdrop);
  backdrop-filter: blur(3px);
  z-index: 18;
  animation: fadeIn 0.14s ease;
}

.sidebar {
  width: var(--sidebar-width);
  min-width: 280px;
  max-width: 400px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--tg-bg-sidebar);
  border-right: 1px solid var(--tg-border);
  position: relative;
  z-index: 20;
  flex-shrink: 0;
}

.sidebar-top {
  height: var(--header-height);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.sidebar-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px 80px;
}

.fab-new-notebook {
  position: absolute;
  right: 18px;
  bottom: 18px;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: var(--tg-accent);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(51, 144, 236, 0.38);
  transition: transform 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
}

.fab-new-notebook:hover {
  background: var(--tg-accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(51, 144, 236, 0.46);
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    width: min(86vw, 330px);
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: var(--tg-menu-shadow);
  }

  .sidebar.mobile-open {
    transform: translateX(0);
  }
}
</style>
