export type AvatarColor =
  | 'blue'
  | 'cyan'
  | 'green'
  | 'orange'
  | 'red'
  | 'violet'
  | 'pink';

export type ThemeMode = 'day' | 'night';

export type SendKeyMode = 'mod-enter' | 'enter';

export interface LightboxItem {
  id: string;
  originalName: string;
  size: number;
  url: string;
}
