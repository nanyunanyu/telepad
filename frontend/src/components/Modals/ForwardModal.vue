<script setup lang="ts">
import { computed, ref } from 'vue';
import { ArrowRight, Copy, X } from 'lucide-vue-next';
import type { Note, Notebook } from '../../types';
import Avatar from '../Common/Avatar.vue';

const props = defineProps<{
  note: Note;
  notebooks: Notebook[];
  onForward: (targetNotebookId: string, mode: 'copy' | 'move') => Promise<void>;
}>();

const emit = defineEmits<{
  close: [];
}>();

const mode = ref<'copy' | 'move'>('copy');
const submittingId = ref<string | null>(null);

const candidates = computed(() =>
  props.notebooks.filter((nb) => (mode.value === 'move' ? nb.id !== props.note.notebookId : true))
);

const handleSelect = async (targetId: string) => {
  submittingId.value = targetId;
  try {
    await props.onForward(targetId, mode.value);
    emit('close');
  } finally {
    submittingId.value = null;
  }
};
</script>

<template>
  <div class="modal-backdrop" @click="emit('close')">
    <div class="modal-card" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">转发 / 移动笔记</h2>
        <button type="button" class="icon-btn sm" aria-label="关闭" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

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

      <div style="display: flex; flex-direction: column; gap: 4px; max-height: 300px; overflow-y: auto">
        <div
          v-if="candidates.length === 0"
          style="text-align: center; padding: 20px; color: var(--tg-text-secondary)"
        >
          没有其他可选笔记本，请先新建一个笔记本
        </div>
        <button
          v-for="nb in candidates"
          v-else
          :key="nb.id"
          type="button"
          class="notebook-item"
          :disabled="submittingId !== null"
          @click="handleSelect(nb.id)"
        >
          <Avatar :icon="nb.icon" :color="nb.avatarColor" size="sm" />
          <div class="notebook-item-body">
            <div class="notebook-item-name">{{ nb.name }}</div>
            <div class="notebook-item-preview">{{ nb.noteCount }} 条笔记</div>
          </div>
          <span v-if="submittingId === nb.id" style="font-size: 12px; color: var(--tg-accent)">
            处理中...
          </span>
        </button>
      </div>
    </div>
  </div>
</template>
