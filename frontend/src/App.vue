<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useKeyboardShortcuts } from '@/core/composables/useKeyboardShortcuts';
import { useTheme } from '@/core/composables/useTheme';
import { useWorkspaceCoordinator } from '@/core/composables/useWorkspaceCoordinator';
import { useUiStore } from '@/core/stores/useUiStore';
import ContextMenu from '@/shared/components/ContextMenu.vue';
import ImageLightbox from '@/shared/components/ImageLightbox.vue';
import ToastContainer from '@/shared/components/ToastContainer.vue';
import { useContextMenu } from '@/shared/composables/useContextMenu';
import BackupModal from '@/modules/backup/components/BackupModal.vue';
import { useBackupStore } from '@/modules/backup/stores/useBackupStore';
import NotebookModal from '@/modules/notebooks/components/NotebookModal.vue';
import Sidebar from '@/modules/notebooks/components/Sidebar.vue';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import ActiveFilterBanner from '@/modules/notes/components/ActiveFilterBanner.vue';
import ChatHeader from '@/modules/notes/components/ChatHeader.vue';
import Composer from '@/modules/notes/components/Composer/Composer.vue';
import ForwardModal from '@/modules/notes/components/ForwardModal.vue';
import MessageStream from '@/modules/notes/components/MessageStream.vue';
import PinnedBanner from '@/modules/notes/components/PinnedBanner.vue';
import { useComposerStore } from '@/modules/notes/stores/useComposerStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import InChatSearchBar from '@/modules/search/components/InChatSearchBar.vue';
import { useSearchStore } from '@/modules/search/stores/useSearchStore';

useTheme();

const ui = useUiStore();
const notebookStore = useNotebookStore();
const noteStore = useNoteStore();
const composerStore = useComposerStore();
const searchStore = useSearchStore();
const backupStore = useBackupStore();
const coordinator = useWorkspaceCoordinator();
const { menuState, closeContextMenu } = useContextMenu();

const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null);

onMounted(() => {
  void coordinator.initWorkspace();
});

useKeyboardShortcuts({
  onGlobalSearch: () => {
    sidebarRef.value?.focusSearch();
  },
  onInChatSearch: () => {
    searchStore.openInChatSearch();
  },
  onEscape: () => {
    if (ui.lightbox) {
      ui.closeLightbox();
    } else if (menuState.value) {
      closeContextMenu();
    } else if (notebookStore.notebookModal.open) {
      notebookStore.closeModal();
    } else if (noteStore.forwardingNote) {
      noteStore.forwardingNote = null;
    } else if (backupStore.modalOpen) {
      backupStore.closeModal();
    } else if (searchStore.inChatSearchOpen) {
      searchStore.closeInChatSearch();
    } else if (composerStore.replyToNote || composerStore.editingNote) {
      composerStore.cancelContext();
    }
  },
});
</script>

<template>
  <div class="app-shell">
    <Sidebar ref="sidebarRef" />

    <main class="chat-main">
      <ChatHeader />
      <InChatSearchBar v-if="searchStore.inChatSearchOpen" />
      <PinnedBanner />
      <ActiveFilterBanner />
      <MessageStream />
      <Composer />
    </main>

    <ContextMenu />
    <NotebookModal v-if="notebookStore.notebookModal.open" />
    <ForwardModal v-if="noteStore.forwardingNote" />
    <BackupModal v-if="backupStore.modalOpen" />

    <ImageLightbox
      v-if="ui.lightbox"
      :items="ui.lightbox.items"
      :index="ui.lightbox.index"
      @change-index="ui.setLightboxIndex"
      @close="ui.closeLightbox()"
    />

    <ToastContainer />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  height: 100%;
  width: 100%;
  background: var(--tg-bg-sidebar);
  position: relative;
}

.chat-main {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background-image: var(--tg-chat-pattern), var(--tg-chat-bg-gradient);
  background-repeat: repeat, no-repeat;
  background-size: 220px 220px, cover;
}
</style>
