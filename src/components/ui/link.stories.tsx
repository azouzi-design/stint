import type { Meta, StoryObj } from '@storybook/react-vite'
import { Link } from './link'

const meta = {
  title: 'UI/Link',
  component: Link,
  args: {
    children: 'Link text',
    href: '#',
  },
} satisfies Meta<typeof Link>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
