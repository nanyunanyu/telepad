<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowRight, Copy } from 'lucide-vue-next';
import Avatar from '@/shared/components/Avatar.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';

const notebookStore = useNotebookStore();
const noteStore = useNoteStore();

const mode = ref<'copy' | 'move'>('copy');
const submittingId = ref<string | null>(null);

const candidates = computed(() => {
  const note = noteStore.forwardingNote;
  if (!note) return [];
  return notebookStore.notebooks.filter((nb) =>
    mode.value === 'move' ? nb.id !== note.notebookId : true
  );
});

const closeModal = () => {
  noteStore.forwardingNote = null;
};

const handleSelect = async (targetId: string) => {
  submittingId.value = targetId;
  try {
    await noteStore.forwardNote(targetId, mode.value);
    closeModal();
  } finally {
    submittingId.value = null;
  }
};
</script>

<template>
  <BaseModal title="转发 / 移动笔记" @close="closeModal">
    <div class="segmented-control">
      <button
        type="button"
        :class="['segmented-btn', { active: mode === 'copy' }]"
        @click="mode = 'copy'"
      >
        <Copy :size="13" style="margin-right: 5px; vertical-align: -2px" />
        复制转发
      </button>
      <button
        type="button"
        :class="['segmented-btn', { active: mode === 'move' }]"
        @click="mode = 'move'"
      >
        <ArrowRight :size="13" style="margin-right: 5px; vertical-align: -2px" />
        移动到频道
      </button>
    </div>

    <div class="forward-list">
      <div v-if="candidates.length === 0" class="forward-empty">
        没有其他可选笔记本，请先新建一个笔记本
      </div>
      <button
        v-for="nb in candidates"
        v-else
        :key="nb.id"
        type="button"
        class="forward-target-item"
        :disabled="submittingId !== null"
        @click="handleSelect(nb.id)"
      >
        <Avatar :icon="nb.icon" :color="nb.avatarColor" size="sm" />
        <div class="forward-target-body">
          <div class="forward-target-name">{{ nb.name }}</div>
          <div class="forward-target-count">{{ nb.noteCount }} 条笔记</div>
        </div>
        <span v-if="submittingId === nb.id" class="forward-target-status">处理中...</span>
      </button>
    </div>
  </BaseModal>
</template>

<style scoped>
.forward-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.forward-empty {
  text-align: center;
  padding: 20px;
  color: var(--tg-text-secondary);
}

.forward-target-item {
  display: flex;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border-radius: var(--radius-md);
  text-align: left;
  transition: background-color 0.12s ease;
  user-select: none;
}

.forward-target-item:hover:not(:disabled) {
  background: var(--tg-bg-hover);
}

.forward-target-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.forward-target-name {
  font-size: 14.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.forward-target-count {
  font-size: 13px;
  color: var(--tg-text-secondary);
}

.forward-target-status {
  font-size: 12px;
  color: var(--tg-accent);
}
</style>
