export const generateComponentTest = ({
  componentName,
}: {
  componentName: {
    pascalCase: string;
    camelCase: string;
    kebabCase: string;
  };
}): string => `
import { render } from '@testing-library/react';
import ${componentName.pascalCase} from './${componentName.kebabCase}';

/*
 * * NOTE: all values inside [[...]] should be replaced
 */
describe('${componentName.pascalCase}', () => {
  const { getByRole } = render(<${componentName.pascalCase} />);

  it('should have [[some expected styles, for example primary color]]', () => {
    // const  ${componentName.camelCase} = getByRole('[[valid role of component]]');
    // expect(${componentName.camelCase}).toHaveStyle({color: [[expected value]]})

    // Dummy test
    expect(true).toBeTruthy();
  });
});
`;
