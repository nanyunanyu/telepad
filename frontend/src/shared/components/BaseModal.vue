<script setup lang="ts">
import { X } from 'lucide-vue-next';

withDefaults(
  defineProps<{
    title: string;
    maxWidth?: string;
  }>(),
  {
    maxWidth: '460px',
  }
);

const emit = defineEmits<{
  close: [];
}>();
</script>

<template>
  <div class="modal-backdrop" @click="emit('close')">
    <div class="modal-card" :style="{ maxWidth }" @click.stop>
      <div class="modal-header">
        <h2 class="modal-title">{{ title }}</h2>
        <button type="button" class="icon-btn sm" aria-label="关闭" @click="emit('close')">
          <X :size="18" />
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: var(--tg-modal-backdrop);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 90;
  animation: fadeIn 0.14s ease;
}

.modal-card {
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--tg-bg-elevated);
  border: 1px solid var(--tg-border-subtle);
  border-radius: 16px;
  box-shadow: var(--tg-menu-shadow);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 17px;
  font-weight: 700;
  margin: 0;
}
</style>
