import { computed, ref, watch } from 'vue';
import { defineStore } from 'pinia';
import { useNoteStore } from '@/modules/notes/stores/useNoteStore';
import { searchApi } from '@/modules/search/api/searchApi';
import type { SearchResultItem } from '@/modules/search/types';

/** Manage global debounced search and in-channel keyword search navigation. */
export const useSearchStore = defineStore('search', () => {
  const noteStore = useNoteStore();

  const globalSearchQuery = ref('');
  const globalSearchResults = ref<SearchResultItem[]>([]);
  const globalSearchLoading = ref(false);
  let searchDebounceTimer: number | null = null;

  const inChatSearchOpen = ref(false);
  const inChatQuery = ref('');
  const inChatMatchIdx = ref(0);

  const inChatMatches = computed<string[]>(() => {
    const q = inChatQuery.value.trim().toLowerCase();
    if (!inChatSearchOpen.value || !q) return [];
    return noteStore.notes
      .filter((n) => n.content.toLowerCase().includes(q))
      .map((n) => n.id);
  });

  const activeHighlightQuery = computed(() =>
    inChatSearchOpen.value ? inChatQuery.value : ''
  );

  watch(globalSearchQuery, (raw) => {
    if (searchDebounceTimer !== null) {
      window.clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }
    const q = raw.trim();
    if (!q) {
      globalSearchResults.value = [];
      globalSearchLoading.value = false;
      return;
    }
    globalSearchLoading.value = true;
    searchDebounceTimer = window.setTimeout(() => {
      searchApi
        .searchNotes(q)
        .then((res) => {
          globalSearchResults.value = res;
        })
        .catch(() => {
          globalSearchResults.value = [];
        })
        .finally(() => {
          globalSearchLoading.value = false;
        });
    }, 180);
  });

  watch(inChatMatches, (matches) => {
    inChatMatchIdx.value = 0;
    if (matches.length > 0) {
      noteStore.focusNoteElement(matches[0]);
    }
  });

  const openInChatSearch = () => {
    inChatSearchOpen.value = true;
  };

  const closeInChatSearch = () => {
    inChatSearchOpen.value = false;
    inChatQuery.value = '';
  };

  const toggleInChatSearch = () => {
    if (inChatSearchOpen.value) {
      closeInChatSearch();
    } else {
      openInChatSearch();
    }
  };

  const prevMatch = () => {
    const matches = inChatMatches.value;
    if (matches.length === 0) return;
    const nextIdx = (inChatMatchIdx.value - 1 + matches.length) % matches.length;
    inChatMatchIdx.value = nextIdx;
    noteStore.focusNoteElement(matches[nextIdx]);
  };

  const nextMatch = () => {
    const matches = inChatMatches.value;
    if (matches.length === 0) return;
    const nextIdx = (inChatMatchIdx.value + 1) % matches.length;
    inChatMatchIdx.value = nextIdx;
    noteStore.focusNoteElement(matches[nextIdx]);
  };

  const clearGlobalSearch = () => {
    globalSearchQuery.value = '';
  };

  return {
    globalSearchQuery,
    globalSearchResults,
    globalSearchLoading,
    inChatSearchOpen,
    inChatQuery,
    inChatMatchIdx,
    inChatMatches,
    activeHighlightQuery,
    openInChatSearch,
    closeInChatSearch,
    toggleInChatSearch,
    prevMatch,
    nextMatch,
    clearGlobalSearch,
  };
});
