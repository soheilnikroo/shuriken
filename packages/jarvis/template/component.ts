export const generateComponent = ({
  componentName,
}: {
  componentName: {
    pascalCase: string;
    camelCase: string;
    kebabCase: string;
  };
}): string => `
import { forwardRef } from 'react';
import { ${componentName.pascalCase}Props } from './${componentName.kebabCase}.types';

/**
 * The ${componentName.pascalCase} component is [[provide a simple definition of your component here ]].
 *
 * ## Usage
 * [[explain how ${componentName.pascalCase} component should be used in your project ]]
 * The ${componentName.pascalCase} component that you can use for your project.
 *
 * import ${componentName.pascalCase} from '@/your-path/${componentName.pascalCase}';
 *
 * const CustomComponent = () => {
 *   return <${componentName.pascalCase} />
 * };
 * Note: [[ provide any notes and edge cases you think user should know about your component]]
 */
const ${componentName.pascalCase} = forwardRef<HTMLDivElement, ${componentName.pascalCase}Prop>(
  (
    { children, color = 'primary',...props },
    forwardedRef,
  ) => {

    return (
      <div
        ref={forwardedRef}
        {...props}
      >
        {children}
      </div>
    );
  },
);

export default ${componentName.pascalCase};
`;
