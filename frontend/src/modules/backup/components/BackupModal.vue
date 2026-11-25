<script setup lang="ts">
import { ref } from 'vue';
import { Database, Download, FolderOpen, Upload } from 'lucide-vue-next';
import { useWorkspaceCoordinator } from '@/core/composables/useWorkspaceCoordinator';
import BaseModal from '@/shared/components/BaseModal.vue';
import { backupApi } from '@/modules/backup/api/backupApi';
import { useBackupStore } from '@/modules/backup/stores/useBackupStore';

const backupStore = useBackupStore();
const coordinator = useWorkspaceCoordinator();

const includeImages = ref(true);
const importMode = ref<'merge' | 'replace'>('merge');
const fileRef = ref<HTMLInputElement | null>(null);

const handleFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  input.value = '';
  await backupStore.importBackupFile(file, importMode.value, coordinator.onBackupImported);
};
</script>

<template>
  <BaseModal title="本地存储与数据备份" @close="backupStore.closeModal()">
    <div v-if="backupStore.storageInfo" class="storage-info-box">
      <div class="storage-summary-row">
        <Database :size="14" />
        <span>
          共 {{ backupStore.storageInfo.notebookCount }} 个笔记本 ·
          {{ backupStore.storageInfo.noteCount }} 条笔记 ·
          {{ backupStore.storageInfo.attachmentCount }} 张图片
        </span>
      </div>
      <div>
        <div>SQLite 数据库：</div>
        <div class="storage-path">{{ backupStore.storageInfo.dbPath }}</div>
      </div>
      <div>
        <div class="storage-dir-label">
          <FolderOpen :size="12" />
          <span>自动同步 Markdown 镜像目录：</span>
        </div>
        <div class="storage-path">{{ backupStore.storageInfo.markdownDir }}</div>
      </div>
    </div>

    <div class="form-field">
      <span class="form-label">全量 JSON 备份导出</span>
      <label class="include-images-label">
        <input v-model="includeImages" type="checkbox" />
        <span>内嵌本地图片数据（跨设备可完整还原图片）</span>
      </label>
      <a
        :href="backupApi.getBackupExportUrl(includeImages)"
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
        :disabled="backupStore.importing"
        @click="fileRef?.click()"
      >
        <Upload :size="16" />
        <span>{{ backupStore.importing ? '正在恢复...' : '选择 JSON 备份文件并导入' }}</span>
      </button>
    </div>

    <div v-if="backupStore.statusMsg" class="status-msg">{{ backupStore.statusMsg }}</div>
    <div v-if="backupStore.error" class="error-msg">{{ backupStore.error }}</div>
  </BaseModal>
</template>

<style scoped>
.storage-info-box {
  padding: 12px;
  border-radius: 10px;
  background: var(--tg-bg-input);
  font-size: 12px;
  color: var(--tg-text-secondary);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.storage-summary-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: var(--tg-text-primary);
}

.storage-dir-label {
  display: flex;
  align-items: center;
  gap: 4px;
}

.storage-path {
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--tg-text-primary);
  word-break: break-all;
}

.include-images-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 4px;
}

.status-msg {
  font-size: 12.5px;
  color: var(--tg-success);
  font-weight: 500;
}

.error-msg {
  font-size: 12.5px;
  color: var(--tg-danger);
}
</style>
