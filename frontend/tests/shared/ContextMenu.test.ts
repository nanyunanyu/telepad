import { afterEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { Copy, Trash2 } from 'lucide-vue-next';
import ContextMenu from '@/shared/components/ContextMenu.vue';
import { useContextMenu } from '@/shared/composables/useContextMenu';

describe('shared/components/ContextMenu', () => {
  afterEach(() => {
    const { closeContextMenu } = useContextMenu();
    closeContextMenu();
  });

  it('opens clamped context menu, renders divider and danger item, and invokes callback', async () => {
    const onCopy = () => {};
    let deleted = false;
    const { openContextMenu, menuState } = useContextMenu();

    const wrapper = mount(ContextMenu);
    const fakeEvent = new MouseEvent('contextmenu', { clientX: 50, clientY: 60 });
    openContextMenu(fakeEvent, [
      { id: 'copy', label: '复制', icon: Copy, onSelect: onCopy },
      {
        id: 'delete',
        label: '删除',
        icon: Trash2,
        danger: true,
        dividerBefore: true,
        onSelect: () => {
          deleted = true;
        },
      },
    ]);

    await wrapper.vm.$nextTick();
    expect(wrapper.find('.context-menu').exists()).toBe(true);
    expect(wrapper.find('.menu-divider').exists()).toBe(true);
    const buttons = wrapper.findAll('button.menu-item');
    expect(buttons).toHaveLength(2);
    expect(buttons[1].classes()).toContain('danger');

    await buttons[1].trigger('click');
    expect(deleted).toBe(true);
    expect(menuState.value).toBeNull();
    wrapper.unmount();
  });
});
