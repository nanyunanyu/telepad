import { ref, type Component } from 'vue';

export interface ContextMenuItem {
  id: string;
  label: string;
  icon: Component;
  danger?: boolean;
  dividerBefore?: boolean;
  onSelect: () => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
}

const menuState = ref<ContextMenuState | null>(null);

/** Shared floating context menu state with viewport boundary clamping. */
export function useContextMenu() {
  const openContextMenu = (e: MouseEvent, items: ContextMenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    const estimatedHeight = Math.max(210, items.length * 38 + 24);
    const x = Math.min(e.clientX, Math.max(8, window.innerWidth - 210));
    const y = Math.min(e.clientY, Math.max(8, window.innerHeight - estimatedHeight));
    menuState.value = { x, y, items };
  };

  const closeContextMenu = () => {
    menuState.value = null;
  };

  return {
    menuState,
    openContextMenu,
    closeContextMenu,
  };
}
