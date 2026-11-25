<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Trash2 } from 'lucide-vue-next';
import { useWorkspaceCoordinator } from '@/core/composables/useWorkspaceCoordinator';
import type { AvatarColor } from '@/core/types/common';
import Avatar from '@/shared/components/Avatar.vue';
import BaseModal from '@/shared/components/BaseModal.vue';
import { useNotebookStore } from '@/modules/notebooks/stores/useNotebookStore';

const EMOJI_CHOICES = [
  '📝', '💡', '🚀', '📚', '💼', '🧠', '🎯', '✅',
  '💻', '🎨', '📌', '🌱', '⚡', '🔥', '🎵', '📷',
];

const COLOR_CHOICES: AvatarColor[] = [
  'blue',
  'cyan',
  'green',
  'orange',
  'red',
  'violet',
  'pink',
];

const notebookStore = useNotebookStore();
const coordinator = useWorkspaceCoordinator();

const targetNotebook = computed(() =>
  notebookStore.notebookModal.open ? notebookStore.notebookModal.notebook : null
);
const isEdit = computed(() => Boolean(targetNotebook.value));

const name = ref(targetNotebook.value?.name ?? '');
const description = ref(targetNotebook.value?.description ?? '');
const icon = ref(targetNotebook.value?.icon ?? '📝');
const avatarColor = ref<AvatarColor>(targetNotebook.value?.avatarColor ?? 'blue');
const isPinned = ref(targetNotebook.value?.isPinned ?? false);
const submitting = ref(false);
const error = ref('');
const nameInputRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  nameInputRef.value?.focus();
});

const handleSubmit = async () => {
  if (!name.value.trim()) {
    error.value = '请输入笔记本名称';
    return;
  }
  submitting.value = true;
  error.value = '';
  try {
    await coordinator.saveNotebook({
      name: name.value.trim(),
      description: description.value.trim(),
      icon: icon.value,
      avatarColor: avatarColor.value,
      isPinned: isPinned.value,
    });
    notebookStore.closeModal();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
};

const handleDeleteClick = async () => {
  if (!targetNotebook.value) return;
  submitting.value = true;
  try {
    const deleted = await coordinator.deleteNotebook(targetNotebook.value);
    if (deleted) notebookStore.closeModal();
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <BaseModal
    :title="isEdit ? '编辑笔记本频道' : '新建笔记本频道'"
    @close="notebookStore.closeModal()"
  >
    <form class="notebook-form" @submit.prevent="handleSubmit">
      <div class="notebook-identity-row">
        <Avatar :icon="icon" :color="avatarColor" />
        <div class="form-field" style="flex: 1">
          <label class="form-label" for="nb-name-input">名称</label>
          <input
            id="nb-name-input"
            ref="nameInputRef"
            v-model="name"
            class="form-input"
            placeholder="例如：工作日志、读书摘录、代码片段"
            maxlength="60"
          />
        </div>
      </div>

      <div class="form-field">
        <label class="form-label" for="nb-desc-input">简介（可选）</label>
        <input
          id="nb-desc-input"
          v-model="description"
          class="form-input"
          placeholder="简短描述这个频道收纳的笔记内容"
          maxlength="240"
        />
      </div>

      <div v-if="!targetNotebook?.isSystem" class="form-field">
        <span class="form-label">图标</span>
        <div class="emoji-grid">
          <button
            v-for="em in EMOJI_CHOICES"
            :key="em"
            type="button"
            :class="['emoji-option', { selected: icon === em }]"
            @click="icon = em"
          >
            {{ em }}
          </button>
        </div>
      </div>

      <div class="form-field">
        <span class="form-label">Telegram 头像配色</span>
        <div class="color-swatch-row">
          <button
            v-for="color in COLOR_CHOICES"
            :key="color"
            type="button"
            :class="['color-swatch', `avatar-${color}`, { selected: avatarColor === color }]"
            :aria-label="`选择颜色 ${color}`"
            @click="avatarColor = color"
          />
        </div>
      </div>

      <label v-if="!targetNotebook?.isSystem" class="pin-checkbox-label">
        <input v-model="isPinned" type="checkbox" />
        <span>置顶在左侧列表顶部</span>
      </label>

      <div v-if="error" class="form-error">{{ error }}</div>

      <div class="modal-actions" style="justify-content: space-between">
        <div>
          <button
            v-if="isEdit && targetNotebook && !targetNotebook.isSystem"
            type="button"
            class="btn btn-danger"
            :disabled="submitting"
            @click="handleDeleteClick"
          >
            <Trash2 :size="15" />
            <span>删除</span>
          </button>
        </div>
        <div class="action-buttons-right">
          <button type="button" class="btn btn-secondary" @click="notebookStore.closeModal()">
            取消
          </button>
          <button type="submit" class="btn btn-primary" :disabled="submitting">
            {{ submitting ? '保存中...' : isEdit ? '保存更改' : '创建笔记本' }}
          </button>
        </div>
      </div>
    </form>
  </BaseModal>
</template>

<style scoped>
.notebook-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.notebook-identity-row {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pin-checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13.5px;
  cursor: pointer;
}

.form-error {
  color: var(--tg-danger);
  font-size: 12.5px;
}

.action-buttons-right {
  display: flex;
  gap: 8px;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
}

.emoji-option {
  height: 36px;
  border-radius: 9px;
  font-size: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--tg-bg-input);
  border: 2px solid transparent;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.emoji-option:hover {
  transform: scale(1.08);
}

.emoji-option.selected {
  border-color: var(--tg-accent);
  background: var(--tg-accent-soft);
}

.color-swatch-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.color-swatch {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 2.5px solid transparent;
  transition: transform 0.12s ease, box-shadow 0.12s ease;
}

.color-swatch.selected {
  transform: scale(1.12);
  box-shadow: 0 0 0 2px var(--tg-bg-elevated), 0 0 0 4px var(--tg-accent);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
