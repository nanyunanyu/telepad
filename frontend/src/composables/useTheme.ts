import { ref, watch } from 'vue';
import type { ThemeMode } from '../types';

const STORAGE_KEY = 'telepad-theme';

function getInitialTheme(): ThemeMode {
  try {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'day' || attr === 'night') return attr;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'day' || saved === 'night') return saved;
  } catch {
    // ignore
  }
  return 'day';
}

const theme = ref<ThemeMode>(getInitialTheme());

watch(
  theme,
  (next) => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  },
  { immediate: true }
);

export function useTheme() {
  const setTheme = (mode: ThemeMode) => {
    theme.value = mode;
  };

  const toggleTheme = () => {
    theme.value = theme.value === 'day' ? 'night' : 'day';
  };

  return { theme, setTheme, toggleTheme };
}
