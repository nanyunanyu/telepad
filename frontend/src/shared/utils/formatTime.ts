function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function getDateKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatSidebarTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const todayKey = getDateKey(now.toISOString());
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yestKey = getDateKey(yest.toISOString());
  const key = getDateKey(iso);

  if (key === todayKey) return formatBubbleTime(iso);
  if (key === yestKey) return '昨天';
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const now = new Date();
  const todayKey = getDateKey(now.toISOString());
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  const yestKey = getDateKey(yest.toISOString());
  const key = getDateKey(iso);

  if (key === todayKey) return '今天';
  if (key === yestKey) return '昨天';
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
