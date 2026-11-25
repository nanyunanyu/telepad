<script setup lang="ts">
import { computed } from 'vue';
import { Bookmark } from 'lucide-vue-next';
import type { AvatarColor } from '@/core/types/common';

const props = withDefaults(
  defineProps<{
    icon?: string;
    color: AvatarColor;
    size?: 'xs' | 'sm' | 'md';
  }>(),
  {
    icon: '',
    size: 'md',
  }
);

const sizeClass = computed(() => (props.size === 'md' ? '' : props.size));
const iconPx = computed(() => (props.size === 'xs' ? 14 : props.size === 'sm' ? 18 : 22));
</script>

<template>
  <div :class="['avatar-circle', sizeClass, `avatar-${color}`]" aria-hidden="true">
    <slot>
      <Bookmark v-if="icon === 'saved-messages'" :size="iconPx" fill="currentColor" :stroke-width="2" />
      <span v-else>{{ icon }}</span>
    </slot>
  </div>
</template>

<style scoped>
.avatar-circle {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 20px;
  font-weight: 600;
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.22);
}

.avatar-circle.sm {
  width: 38px;
  height: 38px;
  font-size: 17px;
}

.avatar-circle.xs {
  width: 28px;
  height: 28px;
  font-size: 13px;
}
</style>
