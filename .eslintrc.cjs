module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
  },
  extends: [
    'airbnb',
    'airbnb-typescript',
    'airbnb/hooks',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.app.json', './tsconfig.node.json'],
  },
  plugins: ['@typescript-eslint'],
  rules: {
    // React 17+ doesn't require React in scope
    'react/react-in-jsx-scope': 'off',
    'react/jsx-uses-react': 'off',
    // Allow .tsx extension for JSX files
    'react/jsx-filename-extension': ['error', { extensions: ['.tsx'] }],
    // Enforce consistent import ordering
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        'newlines-between': 'always',
        alphabetize: { order: 'asc' },
      },
    ],
    // TypeScript handles optional props — defaultProps are unnecessary
    'react/require-default-props': 'off',
    // Disable implicit-arrow-linebreak: it conflicts with max-len when
    // arrow-function bodies are too long to fit on one line
    'implicit-arrow-linebreak': 'off',
    // Allow devDependencies in config files
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: ['vite.config.ts', '**/*.test.ts', '**/*.test.tsx'] },
    ],
  },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
};
