import { ref } from 'vue';
import { defineStore } from 'pinia';
import type { LightboxItem } from '@/core/types/common';

export interface ToastMessage {
  id: number;
  text: string;
  isError?: boolean;
}

export interface LightboxState {
  items: LightboxItem[];
  index: number;
}

/** Manage shared UI overlay states: toasts, mobile drawer, and image lightbox. */
export const useUiStore = defineStore('ui', () => {
  const toasts = ref<ToastMessage[]>([]);
  const mobileSidebarOpen = ref(false);
  const lightbox = ref<LightboxState | null>(null);

  const showToast = (text: string, isError = false) => {
    const id = Date.now() + Math.random();
    toasts.value = [...toasts.value, { id, text, isError }];
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 2600);
  };

  const openMobileSidebar = () => {
    mobileSidebarOpen.value = true;
  };

  const closeMobileSidebar = () => {
    mobileSidebarOpen.value = false;
  };

  const openLightbox = (items: LightboxItem[], index: number) => {
    lightbox.value = { items, index };
  };

  const setLightboxIndex = (index: number) => {
    if (lightbox.value) {
      lightbox.value = { ...lightbox.value, index };
    }
  };

  const closeLightbox = () => {
    lightbox.value = null;
  };

  return {
    toasts,
    mobileSidebarOpen,
    lightbox,
    showToast,
    openMobileSidebar,
    closeMobileSidebar,
    openLightbox,
    setLightboxIndex,
    closeLightbox,
  };
});
