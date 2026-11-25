<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useContextMenu, type ContextMenuItem } from '@/shared/composables/useContextMenu';

const { menuState, closeContextMenu } = useContextMenu();

onMounted(() => {
  window.addEventListener('click', closeContextMenu);
});

onUnmounted(() => {
  window.removeEventListener('click', closeContextMenu);
});

const handleSelect = (item: ContextMenuItem) => {
  closeContextMenu();
  item.onSelect();
};
</script>

<template>
  <div
    v-if="menuState"
    class="context-menu"
    :style="{ left: `${menuState.x}px`, top: `${menuState.y}px` }"
    @click.stop
  >
    <template v-for="item in menuState.items" :key="item.id">
      <div v-if="item.dividerBefore" class="menu-divider" />
      <button
        type="button"
        :class="['menu-item', { danger: item.danger }]"
        @click="handleSelect(item)"
      >
        <span class="menu-item-left">
          <component :is="item.icon" :size="15" />
          <span>{{ item.label }}</span>
        </span>
      </button>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 196px;
  background: var(--tg-menu-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--tg-border-subtle);
  border-radius: var(--radius-md);
  box-shadow: var(--tg-menu-shadow);
  padding: 5px;
  z-index: 100;
  animation: fadeSlideDown 0.12s ease;
}
</style>
