<script setup lang="ts">
import { computed } from 'vue';
import { Bookmark } from 'lucide-vue-next';
import type { AvatarColor } from '../../types';

const props = withDefaults(
  defineProps<{
    icon: string;
    color: AvatarColor;
    size?: 'xs' | 'sm' | 'md';
  }>(),
  {
    size: 'md',
  }
);

const sizeClass = computed(() => (props.size === 'md' ? '' : props.size));
const iconPx = computed(() => (props.size === 'xs' ? 14 : props.size === 'sm' ? 18 : 22));
</script>

<template>
  <div :class="['avatar-circle', sizeClass, `avatar-${color}`]" aria-hidden="true">
    <Bookmark v-if="icon === 'saved-messages'" :size="iconPx" fill="currentColor" :stroke-width="2" />
    <span v-else>{{ icon }}</span>
  </div>
</template>
