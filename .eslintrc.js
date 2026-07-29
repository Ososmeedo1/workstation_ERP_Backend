/**
 * ESLint configuration for StudySpace ERP Backend
 *
 * @description Enforces consistent code style and catches common errors
 */
module.exports = {
  env: {
    node: true,
    es2021: true,
    commonjs: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_|^next$|^req$|^res$' }],
    'no-undef': 'error',
    'no-console': 'off', // Allow console for server logs

    // Code style
    'indent': ['warn', 2, { SwitchCase: 1 }],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'never'],

    // Best practices
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'all'],
    'no-var': 'warn',
    'prefer-const': 'warn',

    // Spacing
    'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
    'no-trailing-spaces': 'warn',
    'space-before-blocks': 'warn',
    'keyword-spacing': 'warn',
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],

    // Async
    'no-async-promise-executor': 'error',
    'require-await': 'off'
  },
  ignorePatterns: [
    'node_modules/',
    'coverage/',
    'dist/',
    '*.min.js'
  ]
};
