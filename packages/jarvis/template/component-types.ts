export const generateComponentTypes = ({
  componentName,
}: {
  componentName: {
    pascalCase: string;
    camelCase: string;
  };
}): string => `
type ${componentName.pascalCase}BaseProps = HTMLDivElement & {
  /**
   * Color property.
   */
  color?: string;
};

export type ${componentName.pascalCase}Props = ${componentName.pascalCase}BaseProps;
`;
