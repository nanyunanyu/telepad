<script setup lang="ts">
import { useUiStore } from '@/core/stores/useUiStore';

const ui = useUiStore();
</script>

<template>
  <div v-if="ui.toasts.length > 0" class="toast-container" aria-live="polite">
    <div
      v-for="t in ui.toasts"
      :key="t.id"
      :class="['toast-pill', { error: t.isError }]"
    >
      {{ t.text }}
    </div>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 150;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast-pill {
  padding: 9px 18px;
  border-radius: var(--radius-pill);
  background: rgba(24, 34, 45, 0.92);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  animation: fadeSlideUp 0.16s ease;
}

.toast-pill.error {
  background: #c62828;
}
</style>
