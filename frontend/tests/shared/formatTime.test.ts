import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  escapeRegex,
  formatBubbleTime,
  formatDateSeparator,
  formatFileSize,
  formatSidebarTime,
  getDateKey,
} from '@/shared/utils/formatTime';

describe('shared/utils/formatTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-25T15:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats date keys and bubble times', () => {
    expect(getDateKey('2026-11-25T09:05:00')).toBe('2026-11-25');
    expect(formatBubbleTime('2026-11-25T09:05:00')).toBe('09:05');
    expect(formatBubbleTime('invalid')).toBe('');
  });

  it('formats relative sidebar and separator labels', () => {
    expect(formatSidebarTime(null)).toBe('');
    expect(formatSidebarTime('2026-11-25T08:07:00')).toBe('08:07');
    expect(formatSidebarTime('2026-11-24T20:00:00')).toBe('昨天');
    expect(formatSidebarTime('2026-10-03T12:00:00')).toBe('10/3');
    expect(formatSidebarTime('2025-05-02T12:00:00')).toBe('2025/5/2');

    expect(formatDateSeparator('2026-11-25T08:07:00')).toBe('今天');
    expect(formatDateSeparator('2026-11-24T20:00:00')).toBe('昨天');
    expect(formatDateSeparator('2026-10-03T12:00:00')).toBe('10月3日');
    expect(formatDateSeparator('2025-05-02T12:00:00')).toBe('2025年5月2日');
  });

  it('formats file sizes and escapes regex meta characters', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2.0 KB');
    expect(formatFileSize(1024 * 1024 * 3)).toBe('3.0 MB');
    expect(escapeRegex('a+b*(c)?[1]')).toBe('a\\+b\\*\\(c\\)\\?\\[1\\]');
  });
});
