<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import {
  Copy,
  Download,
  Edit3,
  Forward,
  Hash,
  Pin,
  PinOff,
  Reply,
  Trash2,
  X,
} from 'lucide-vue-next';
import { api } from './api/client';
import { useTheme } from './composables/useTheme';
import { useKeyboardShortcuts } from './composables/useKeyboardShortcuts';
import { useTelepadStore } from './stores/telepad';
import Sidebar from './components/Sidebar/Sidebar.vue';
import ChatHeader from './components/ChatArea/ChatHeader.vue';
import PinnedBanner from './components/ChatArea/PinnedBanner.vue';
import InChatSearchBar from './components/ChatArea/InChatSearchBar.vue';
import MessageStream from './components/ChatArea/MessageStream.vue';
import Composer from './components/ChatArea/Composer.vue';
import NotebookModal from './components/Modals/NotebookModal.vue';
import ForwardModal from './components/Modals/ForwardModal.vue';
import ImageLightbox from './components/Modals/ImageLightbox.vue';
import BackupModal from './components/Modals/BackupModal.vue';

const { theme, toggleTheme } = useTheme();
const store = useTelepadStore();
const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null);

const closeNoteCtxMenu = () => {
  store.noteCtxMenu = null;
};

onMounted(() => {
  window.addEventListener('click', closeNoteCtxMenu);
  void store.init();
});

onUnmounted(() => {
  window.removeEventListener('click', closeNoteCtxMenu);
});

useKeyboardShortcuts({
  onGlobalSearch: () => {
    sidebarRef.value?.focusSearch();
  },
  onInChatSearch: () => {
    store.inChatSearchOpen = true;
  },
  onEscape: () => {
    if (store.lightbox) {
      store.lightbox = null;
    } else if (store.noteCtxMenu) {
      store.noteCtxMenu = null;
    } else if (store.inChatSearchOpen) {
      store.inChatSearchOpen = false;
      store.inChatQuery = '';
    } else if (store.replyToNote || store.editingNote) {
      store.handleCancelComposerContext();
    }
  },
});

const exportNotebook = (notebookId: string) => {
  window.location.href = api.getNotebookExportUrl(notebookId);
};

const exportSingleNote = (noteId: string) => {
  window.location.href = api.getNoteExportUrl(noteId);
};
</script>

<template>
  <div class="app-shell">
    <Sidebar
      ref="sidebarRef"
      :notebooks="store.notebooks"
      :active-notebook-id="store.activeNotebook?.id ?? ''"
      :tags="store.tags"
      :active-tag="store.activeTag"
      :theme="theme"
      :global-search-query="store.globalSearchQuery"
      :global-search-loading="store.globalSearchLoading"
      :global-search-results="store.globalSearchResults"
      :mobile-open="store.mobileSidebarOpen"
      @select-notebook="store.handleSelectNotebook"
      @select-tag="(tag) => (store.activeTag = tag)"
      @update:global-search-query="(q) => (store.globalSearchQuery = q)"
      @select-search-result="store.handleSelectSearchResult"
      @toggle-theme="toggleTheme"
      @open-new-notebook="store.notebookModal = { open: true, notebook: null }"
      @edit-notebook="(nb) => (store.notebookModal = { open: true, notebook: nb })"
      @toggle-pin-notebook="store.handleTogglePinNotebook"
      @export-notebook="(nb) => exportNotebook(nb.id)"
      @delete-notebook="store.handleDeleteNotebook"
      @open-backup-modal="store.backupModalOpen = true"
      @close-mobile="store.mobileSidebarOpen = false"
    />

    <main class="chat-main">
      <ChatHeader
        :notebook="store.activeNotebook"
        :theme="theme"
        :in-chat-search-open="store.inChatSearchOpen"
        :pinned-only="store.pinnedOnly"
        @open-mobile-sidebar="store.mobileSidebarOpen = true"
        @toggle-in-chat-search="
          () => {
            if (store.inChatSearchOpen) store.inChatQuery = '';
            store.inChatSearchOpen = !store.inChatSearchOpen;
          }
        "
        @toggle-pinned-only="store.pinnedOnly = !store.pinnedOnly"
        @export-notebook="
          () => {
            if (store.activeNotebook) exportNotebook(store.activeNotebook.id);
          }
        "
        @edit-notebook="
          () => {
            if (store.activeNotebook) {
              store.notebookModal = { open: true, notebook: store.activeNotebook };
            }
          }
        "
        @toggle-theme="toggleTheme"
      />

      <InChatSearchBar
        v-if="store.inChatSearchOpen"
        :query="store.inChatQuery"
        :match-count="store.inChatMatches.length"
        :current-match-index="store.inChatMatchIdx"
        @update:query="(q) => (store.inChatQuery = q)"
        @prev="store.handleInChatPrev"
        @next="store.handleInChatNext"
        @close="
          store.inChatSearchOpen = false;
          store.inChatQuery = '';
        "
      />

      <PinnedBanner
        :pinned-notes="store.channelPinnedNotes"
        @jump-to-note="store.handleJumpToNote"
        @unpin="store.handleTogglePinNote"
        @toggle-pinned-filter="store.pinnedOnly = !store.pinnedOnly"
      />

      <div v-if="store.activeTag || store.pinnedOnly" class="active-filter-banner">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
          <span>当前筛选：</span>
          <span v-if="store.activeTag" class="active-filter-pill">
            <Hash :size="12" />
            {{ store.activeTag }}
          </span>
          <span v-if="store.pinnedOnly" class="active-filter-pill">
            <Pin :size="12" />
            仅置顶笔记
          </span>
          <span>（共 {{ store.notes.length }} 条）</span>
        </div>
        <button
          type="button"
          class="toolbar-btn"
          @click="
            store.activeTag = null;
            store.pinnedOnly = false;
          "
        >
          <X :size="13" />
          <span>清除筛选</span>
        </button>
      </div>

      <MessageStream
        :notes="store.notes"
        :loading="store.notesLoading"
        :notebook-name="store.activeNotebook?.name ?? 'Telepad'"
        :highlighted-note-id="store.highlightedNoteId"
        :search-query="store.activeHighlightQuery"
        :scroll-trigger="store.scrollTrigger"
        @reply="store.handleStartReply"
        @edit="store.handleStartEdit"
        @toggle-pin="store.handleTogglePinNote"
        @copy-markdown="store.handleCopyMarkdown"
        @toggle-checkbox="store.handleToggleCheckbox"
        @jump-to-note="store.handleJumpToNote"
        @tag-click="store.handleTagClick"
        @open-lightbox="(attachments, index) => (store.lightbox = { attachments, index })"
        @note-context-menu="store.handleNoteContextMenu"
        @drop-files="(files) => void store.handleUploadFiles(files)"
      />

      <Composer
        :notebook-name="store.activeNotebook?.name ?? 'Saved Messages'"
        :reply-to-note="store.replyToNote"
        :editing-note="store.editingNote"
        :pending-attachments="store.pendingAttachments"
        :uploading-images="store.uploadingImages"
        :on-submit="store.handleComposerSubmit"
        @cancel-context="store.handleCancelComposerContext"
        @upload-files="(files) => void store.handleUploadFiles(files)"
        @remove-attachment="store.handleRemovePendingAttachment"
      />
    </main>

    <!-- Bubble Right-Click / More Context Menu -->
    <div
      v-if="store.noteCtxMenu"
      class="context-menu"
      :style="{ left: `${store.noteCtxMenu.x}px`, top: `${store.noteCtxMenu.y}px` }"
      @click.stop
    >
      <button
        type="button"
        class="menu-item"
        @click="
          store.handleStartReply(store.noteCtxMenu.note);
          store.noteCtxMenu = null;
        "
      >
        <span class="menu-item-left">
          <Reply :size="15" />
          <span>引用回复</span>
        </span>
      </button>

      <button
        type="button"
        class="menu-item"
        @click="
          store.handleStartEdit(store.noteCtxMenu.note);
          store.noteCtxMenu = null;
        "
      >
        <span class="menu-item-left">
          <Edit3 :size="15" />
          <span>编辑笔记</span>
        </span>
      </button>

      <button
        type="button"
        class="menu-item"
        @click="
          void store.handleTogglePinNote(store.noteCtxMenu.note);
          store.noteCtxMenu = null;
        "
      >
        <span class="menu-item-left">
          <PinOff v-if="store.noteCtxMenu.note.isPinned" :size="15" />
          <Pin v-else :size="15" />
          <span>{{ store.noteCtxMenu.note.isPinned ? '取消置顶' : '置顶笔记' }}</span>
        </span>
      </button>

      <button
        type="button"
        class="menu-item"
        @click="
          void store.handleCopyMarkdown(store.noteCtxMenu.note);
          store.noteCtxMenu = null;
        "
      >
        <span class="menu-item-left">
          <Copy :size="15" />
          <span>复制 Markdown</span>
        </span>
      </button>

      <button
        type="button"
        class="menu-item"
        @click="
          store.forwardingNote = store.noteCtxMenu.note;
          store.noteCtxMenu = null;
        "
      >
        <span class="menu-item-left">
          <Forward :size="15" />
          <span>转发 / 移动</span>
        </span>
      </button>

      <button
        type="button"
        class="menu-item"
        @click="
          exportSingleNote(store.noteCtxMenu.note.id);
          store.noteCtxMenu = null;
        "
      >
        <span class="menu-item-left">
          <Download :size="15" />
          <span>导出单篇 .md</span>
        </span>
      </button>

      <div class="menu-divider" />

      <button
        type="button"
        class="menu-item danger"
        @click="
          void store.handleDeleteNote(store.noteCtxMenu.note);
          store.noteCtxMenu = null;
        "
      >
        <span class="menu-item-left">
          <Trash2 :size="15" />
          <span>删除笔记</span>
        </span>
      </button>
    </div>

    <!-- Modals -->
    <NotebookModal
      v-if="store.notebookModal.open"
      :notebook="store.notebookModal.notebook"
      :on-save="store.handleSaveNotebook"
      :on-delete="store.handleDeleteNotebook"
      @close="store.notebookModal = { open: false }"
    />

    <ForwardModal
      v-if="store.forwardingNote"
      :note="store.forwardingNote"
      :notebooks="store.notebooks"
      :on-forward="store.handleForwardNote"
      @close="store.forwardingNote = null"
    />

    <BackupModal
      v-if="store.backupModalOpen"
      :on-imported="store.handleBackupImported"
      @close="store.backupModalOpen = false"
    />

    <ImageLightbox
      v-if="store.lightbox"
      :attachments="store.lightbox.attachments"
      :index="store.lightbox.index"
      @change-index="
        (nextIdx) => {
          if (store.lightbox) store.lightbox = { ...store.lightbox, index: nextIdx };
        }
      "
      @close="store.lightbox = null"
    />

    <!-- Toasts -->
    <div v-if="store.toasts.length > 0" class="toast-container" aria-live="polite">
      <div
        v-for="t in store.toasts"
        :key="t.id"
        :class="['toast-pill', { error: t.isError }]"
      >
        {{ t.text }}
      </div>
    </div>
  </div>
</template>
