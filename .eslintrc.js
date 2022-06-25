module.exports = {
    extends: [
        'airbnb-base',
        'airbnb-typescript/base',
    ],
    rules: {
        camelcase: 'off',
        'object-curly-newline': 0,
        'class-methods-use-this': 0,
        'arrow-parens': 0,
        'max-len': ['error', { code: 120 }],
        '@typescript-eslint/indent': ['error', 4],
        '@typescript-eslint/lines-between-class-members': 0,
        'import/prefer-default-export': 'off',
    },
    parserOptions: {
        project: './tsconfig.eslint.json',
    },
};
