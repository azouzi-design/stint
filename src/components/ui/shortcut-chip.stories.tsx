import type { Meta, StoryObj } from '@storybook/react-vite'
import { ShortcutChip } from './shortcut-chip'

const meta = {
  title: 'UI/ShortcutChip',
  component: ShortcutChip,
  argTypes: {
    variant: {
      control: 'select',
      options: ['confirm', 'cancel'],
    },
  },
} satisfies Meta<typeof ShortcutChip>

export default meta
type Story = StoryObj<typeof meta>

export const Confirm: Story = {
  args: { variant: 'confirm', keyLabel: 'Enter' },
}

export const Cancel: Story = {
  args: { variant: 'cancel', keyLabel: 'Esc' },
}
