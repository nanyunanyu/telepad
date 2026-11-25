<script setup lang="ts">
import {
  Bold,
  CheckSquare,
  Code,
  Eye,
  FileCode2,
  Hash,
  Heading3,
  Italic,
  Pencil,
  Quote,
  Strikethrough,
} from 'lucide-vue-next';

defineProps<{
  previewMode: boolean;
}>();

const emit = defineEmits<{
  insertFormat: [prefix: string, suffix?: string, placeholder?: string];
  insertLinePrefix: [linePrefix: string];
  togglePreview: [];
}>();
</script>

<template>
  <div class="composer-toolbar">
    <div class="composer-toolbar-group">
      <button
        type="button"
        class="toolbar-btn"
        title="加粗"
        @click="emit('insertFormat', '**', '**', '加粗文本')"
      >
        <Bold :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="斜体"
        @click="emit('insertFormat', '*', '*', '斜体文本')"
      >
        <Italic :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="删除线"
        @click="emit('insertFormat', '~~', '~~', '删除线')"
      >
        <Strikethrough :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="标题"
        @click="emit('insertLinePrefix', '### ')"
      >
        <Heading3 :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="待办清单 Checkbox"
        @click="emit('insertLinePrefix', '- [ ] ')"
      >
        <CheckSquare :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="引用"
        @click="emit('insertLinePrefix', '> ')"
      >
        <Quote :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="行内代码"
        @click="emit('insertFormat', '`', '`', 'code')"
      >
        <Code :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="代码块"
        @click="emit('insertFormat', '```ts\n', '\n```', '// 代码片段')"
      >
        <FileCode2 :size="14" />
      </button>
      <button
        type="button"
        class="toolbar-btn"
        title="插入标签"
        @click="emit('insertFormat', '#', '', '标签')"
      >
        <Hash :size="14" />
      </button>
    </div>

    <button
      type="button"
      :class="['toolbar-btn', { active: previewMode }]"
      title="切换 Markdown 实时预览"
      @click="emit('togglePreview')"
    >
      <Pencil v-if="previewMode" :size="13" />
      <Eye v-else :size="13" />
      <span>{{ previewMode ? '继续编辑' : '实时预览' }}</span>
    </button>
  </div>
</template>

<style scoped>
.composer-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 5px 10px;
  border-bottom: 1px solid var(--tg-border-subtle);
  overflow-x: auto;
}

.composer-toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
</style>
