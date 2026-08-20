import type { Meta, StoryObj } from '@storybook/react-vite'
import UserIcon from 'pixelarticons/svg/user.svg?react'
import { IconButton } from './icon-button'

const meta = {
  title: 'UI/IconButton',
  component: IconButton,
  args: {
    children: <UserIcon className="size-16" />,
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['outline', 'ghost'],
    },
  },
} satisfies Meta<typeof IconButton>

export default meta
type Story = StoryObj<typeof meta>

export const Outline: Story = {
  args: { variant: 'outline' },
}

export const Ghost: Story = {
  args: { variant: 'ghost' },
}

export const Disabled: Story = {
  args: { variant: 'outline', disabled: true },
}
