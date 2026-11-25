<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Trash2, X } from 'lucide-vue-next';
import type { AvatarColor, Notebook } from '../../types';
import Avatar from '../Common/Avatar.vue';

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

const props = defineProps<{
  notebook?: Notebook | null;
  onSave: (data: {
    name: string;
    description: string;
    icon: string;
    avatarColor: AvatarColor;
    isPinned: boolean;
  }) => Promise<void>;
  onDelete?: (notebook: Notebook) => Promise<boolean>;
}>();

const emit = defineEmits<{
  close: [];
}>();

const isEdit = computed(() => Boolean(props.notebook));
const name = ref(props.notebook?.name ?? '');
const description = ref(props.notebook?.description ?? '');
const icon = ref(props.notebook?.icon ?? '📝');
const avatarColor = ref<AvatarColor>(props.notebook?.avatarColor ?? 'blue');
const isPinned = ref(props.notebook?.isPinned ?? false);
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
    await props.onSave({
      name: name.value.trim(),
      description: description.value.trim(),
      icon: icon.value,
      avatarColor: avatarColor.value,
      isPinned: isPinned.value,
    });
    emit('close');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败';
  } finally {
    submitting.value = false;
  }
};

const handleDeleteClick = async () => {
  if (!props.notebook || !props.onDelete) return;
  submitting.value = true;
  try {
    const deleted = await props.onDelete(props.notebook);
    if (deleted) emit('close');
  } finally {
    submitting.value = false;
  }
};
</script>

<template>
  <div class="modal-backdrop" @click="emit('close')">
    <div class="modal-card" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ isEdit ? '编辑笔记本频道' : '新建笔记本频道' }}</h2>
        <button type="button" class="icon-btn sm" aria-label="关闭" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <form
        style="display: flex; flex-direction: column; gap: 14px"
        @submit.prevent="handleSubmit"
      >
        <div style="display: flex; align-items: center; gap: 14px">
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

        <div v-if="!notebook?.isSystem" class="form-field">
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

        <label
          v-if="!notebook?.isSystem"
          style="display: flex; align-items: center; gap: 8px; font-size: 13.5px; cursor: pointer"
        >
          <input v-model="isPinned" type="checkbox" />
          <span>置顶在左侧列表顶部</span>
        </label>

        <div v-if="error" style="color: var(--tg-danger); font-size: 12.5px">
          {{ error }}
        </div>

        <div class="modal-actions" style="justify-content: space-between">
          <div>
            <button
              v-if="isEdit && notebook && !notebook.isSystem && onDelete"
              type="button"
              class="btn btn-danger"
              :disabled="submitting"
              @click="handleDeleteClick"
            >
              <Trash2 :size="15" />
              <span>删除</span>
            </button>
          </div>
          <div style="display: flex; gap: 8px">
            <button type="button" class="btn btn-secondary" @click="emit('close')">
              取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? '保存中...' : isEdit ? '保存更改' : '创建笔记本' }}
            </button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
