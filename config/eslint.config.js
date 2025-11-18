import { createEslintConfig } from '@planttheidea/build-tools';

export default createEslintConfig({
  config: 'config',
  configs: [
    {
      rules: {
        '@typescript-eslint/no-non-null-assertion': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        '@typescript-eslint/no-unused-expressions': 'off',
        '@typescript-eslint/prefer-for-of': 'off',
        '@typescript-eslint/prefer-nullish-coalescing': 'off',
        '@typescript-eslint/prefer-optional-chain': 'off',
        '@typescript-eslint/restrict-plus-operands': 'off',
      },
    },
    {
      files: ['dev/*.ts'],
      rules: {
        '@typescript-eslint/no-empty-function': 'off',
        '@typescript-eslint/no-floating-promises': 'off',
        '@typescript-eslint/restrict-template-expressions': 'off',
      },
    },
  ],
  development: 'dev',
  react: false,
  source: 'src',
});
