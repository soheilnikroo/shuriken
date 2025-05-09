export const generateIndexFile = ({
  componentName,
}: {
  componentName: {
    pascalCase: string;
    camelCase: string;
    kebabCase: string;
  };
}): string => `
export { default as ${componentName.pascalCase} } from './${componentName.kebabCase}';
export type { ${componentName.pascalCase}Props } from './${componentName.kebabCase}';
`;
