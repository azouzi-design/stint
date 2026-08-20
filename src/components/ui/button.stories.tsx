import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './button'

const meta = {
  title: 'UI/Button',
  component: Button,
  args: {
    children: 'Button',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'run', 'cancel', 'shade'],
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

export const Primary: Story = {
  args: { variant: 'primary' },
}

export const Secondary: Story = {
  args: { variant: 'secondary' },
}

export const Run: Story = {
  args: { variant: 'run', children: 'Run' },
}

export const Cancel: Story = {
  args: { variant: 'cancel', children: 'Cancel' },
}

export const Shade: Story = {
  args: { variant: 'shade', children: 'Shade' },
}

export const Disabled: Story = {
  args: { variant: 'primary', disabled: true },
}
