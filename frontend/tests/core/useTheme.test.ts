import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';

describe('core/composables/useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('initializes from saved localStorage theme and toggles persistently', async () => {
    localStorage.setItem('telepad-theme', 'night');
    const { useTheme } = await import('@/core/composables/useTheme');

    const { theme, toggleTheme, setTheme } = useTheme();
    expect(theme.value).toBe('night');
    expect(document.documentElement.getAttribute('data-theme')).toBe('night');

    toggleTheme();
    await nextTick();
    expect(theme.value).toBe('day');
    expect(document.documentElement.getAttribute('data-theme')).toBe('day');
    expect(localStorage.getItem('telepad-theme')).toBe('day');

    setTheme('night');
    await nextTick();
    expect(document.documentElement.getAttribute('data-theme')).toBe('night');
    expect(localStorage.getItem('telepad-theme')).toBe('night');
  });
});
