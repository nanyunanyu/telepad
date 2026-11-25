<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Database, Download, FolderOpen, Upload, X } from 'lucide-vue-next';
import type { BackupPayload, StorageInfo } from '../../types';
import { api } from '../../api/client';

const props = defineProps<{
  onImported: (summary: string) => Promise<void>;
}>();

const emit = defineEmits<{
  close: [];
}>();

const info = ref<StorageInfo | null>(null);
const includeImages = ref(true);
const importMode = ref<'merge' | 'replace'>('merge');
const importing = ref(false);
const statusMsg = ref('');
const error = ref('');
const fileRef = ref<HTMLInputElement | null>(null);

onMounted(() => {
  api
    .getStorageInfo()
    .then((data) => {
      info.value = data;
    })
    .catch(() => {});
});

const handleFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';

  if (
    importMode.value === 'replace' &&
    !window.confirm('覆盖恢复将清空现有全部笔记本与笔记并替换为备份内容，确定继续？')
  ) {
    return;
  }

  importing.value = true;
  error.value = '';
  statusMsg.value = '';
  try {
    const text = await file.text();
    const payload = JSON.parse(text) as BackupPayload;
    const result = await api.importBackup(payload, importMode.value);
    const summary = `导入完成：${result.importedNotebooks} 个笔记本、${result.importedNotes} 条笔记、${result.importedAttachments} 张图片`;
    statusMsg.value = summary;
    await props.onImported(summary);
    info.value = await api.getStorageInfo();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '导入失败，请确认 JSON 备份文件格式';
  } finally {
    importing.value = false;
  }
};
</script>

<template>
  <div class="modal-backdrop" @click="emit('close')">
    <div class="modal-card" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">本地存储与数据备份</h2>
        <button type="button" class="icon-btn sm" aria-label="关闭" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>

      <div v-if="info" class="storage-info-box">
        <div
          style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: var(--tg-text-primary)"
        >
          <Database :size="14" />
          <span>
            共 {{ info.notebookCount }} 个笔记本 · {{ info.noteCount }} 条笔记 · {{ info.attachmentCount }} 张图片
          </span>
        </div>
        <div>
          <div>SQLite 数据库：</div>
          <div class="storage-path">{{ info.dbPath }}</div>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 4px">
            <FolderOpen :size="12" />
            <span>自动同步 Markdown 镜像目录：</span>
          </div>
          <div class="storage-path">{{ info.markdownDir }}</div>
        </div>
      </div>

      <div class="form-field">
        <span class="form-label">全量 JSON 备份导出</span>
        <label
          style="display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; margin-bottom: 4px"
        >
          <input v-model="includeImages" type="checkbox" />
          <span>内嵌本地图片数据（跨设备可完整还原图片）</span>
        </label>
        <a
          :href="api.getBackupExportUrl(includeImages)"
          class="btn btn-primary"
          style="text-decoration: none"
        >
          <Download :size="16" />
          <span>导出全量 JSON 备份</span>
        </a>
      </div>

      <div class="menu-divider" style="margin: 2px 0" />

      <div class="form-field">
        <span class="form-label">从 JSON 备份导入恢复</span>
        <div class="segmented-control">
          <button
            type="button"
            :class="['segmented-btn', { active: importMode === 'merge' }]"
            @click="importMode = 'merge'"
          >
            增量合并（保留现有）
          </button>
          <button
            type="button"
            :class="['segmented-btn', { active: importMode === 'replace' }]"
            @click="importMode = 'replace'"
          >
            完全覆盖恢复
          </button>
        </div>
        <input
          ref="fileRef"
          type="file"
          accept="application/json,.json"
          style="display: none"
          @change="handleFileChange"
        />
        <button
          type="button"
          class="btn btn-secondary"
          :disabled="importing"
          @click="fileRef?.click()"
        >
          <Upload :size="16" />
          <span>{{ importing ? '正在恢复...' : '选择 JSON 备份文件并导入' }}</span>
        </button>
      </div>

      <div v-if="statusMsg" style="font-size: 12.5px; color: var(--tg-success); font-weight: 500">
        {{ statusMsg }}
      </div>
      <div v-if="error" style="font-size: 12.5px; color: var(--tg-danger)">
        {{ error }}
      </div>
    </div>
  </div>
</template>
