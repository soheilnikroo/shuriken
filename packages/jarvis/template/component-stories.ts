export const generateStories = ({
  componentName,
}: {
  componentName: {
    pascalCase: string;
    camelCase: string;
    kebabCase: string;
  };
}): string => `
import type { Meta, StoryObj } from '@storybook/react';
import type { Locales } from '@/types';
import ${componentName.pascalCase} from './${componentName.kebabCase}';

// you can remove it if  you don't have text depend on your locale
const child: Record<Locales, string> = {
  'fa-IR': 'فارسی',
  'en-GB': 'english',
};

type Story = StoryObj<typeof ${componentName.pascalCase}>;

const meta: Meta<typeof ${componentName.pascalCase}> = {
  title: '${componentName.pascalCase}/${componentName.pascalCase}',
  component: ${componentName.pascalCase},
  render: (args, { globals: { locale } }) => (
    <${componentName.pascalCase} {...args}>{child[locale]}</${componentName.pascalCase}>
  ),
};

export const Default: Story = {};

/**
 * A variation of the \`${componentName.pascalCase}\` component with [[ the props you passed to that story, like: secondary color]].
 */
export const WithSecondaryColor: Story = {
  args: {
    color: 'secondary',
  },
};

export default meta;
`;
