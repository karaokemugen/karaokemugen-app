// @ts-check

import js from '@eslint/js';
import ts from 'typescript-eslint';
import security from 'eslint-plugin-security';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	security.configs.recommended,
	prettierConfig,
	{
		plugins: {
			'@typescript-eslint': ts.plugin,
			security: security,
			'simple-import-sort': simpleImportSort,
		},
		rules: {
			'arrow-body-style': 0,
			'arrow-parens': 0,
			'class-methods-use-this': 0,
			'consistent-return': 0,
			curly: 0,
			'default-case': 1,
			'default-param-last': 0,
			eqeqeq: 2,
			'function-paren-newline': 0,
			'implicit-arrow-linebreak': 0,
			'import/no-cycle': 0,
			'import/no-extraneous-dependencies': 0,
			'import/order': 0,
			'import/prefer-default-export': 0,
			'linebreak-style': 0,
			'max-classes-per-file': 0,
			'max-len': 0,
			'no-await-in-loop': 0,
			'no-case-declarations': 0,
			'no-cond-assign': ['warn', 'except-parens'],
			'no-continue': 0,
			'no-control-regex': 0,
			'no-console': 0,
			'no-duplicate-imports': 1,
			'no-mixed-spaces-and-tabs': 0,
			'no-nested-ternary': 0,
			'no-return-assign': 0,
			'no-restricted-syntax': 0,
			'no-multi-assign': [
				'warn',
				{
					ignoreNonDeclaration: true,
				},
			],
			'no-param-reassign': 0,
			'no-return-await': 0,
			'no-restricted-globals': 0,
			'no-tabs': [
				'warn',
				{
					allowIndentationTabs: true,
				},
			],
			'no-throw-literal': 0,
			'no-trailing-spaces': 0,
			'no-underscore-dangle': 0,
			'no-unsafe-finally': 0,
			'no-unsafe-optional-chaining': [
				'error',
				{
					disallowArithmeticOperators: false,
				},
			],
			'no-unused-vars': [
				'error',
				{
					caughtErrors: 'none',
				},
			],
			'no-useless-catch': 0,
			'no-var': 2,
			'nonblock-statement-body-position': 0,
			'object-curly-newline': 0,
			'operator-linebreak': 0,
			'prefer-const': 1,
			'prefer-destructuring': 0,
			'prefer-promise-reject-errors': 1,
			'prefer-rest-params': 0,
			'require-await': 0,
			'simple-import-sort/imports': 'warn',
			'simple-import-sort/exports': 'warn',
			'@typescript-eslint/ban-ts-comment': 0,
			'@typescript-eslint/comma-dangle': 0,
			'@typescript-eslint/explicit-module-boundary-types': 0,
			'@typescript-eslint/indent': 0,
			'@typescript-eslint/naming-convention': 0,
			'@typescript-eslint/object-curly-spacing': 0,
			'@typescript-eslint/no-empty-function': 0,
			'@typescript-eslint/no-explicit-any': 0,
			'@typescript-eslint/no-this-alias': 0,
			'@typescript-eslint/no-throw-literal': 0,
			'@typescript-eslint/no-unused-expressions': 0,
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					caughtErrors: 'none',
				},
			],
			'@typescript-eslint/no-use-before-define': 0,
			'@typescript-eslint/no-var-requires': 0,
			'@typescript-eslint/space-before-blocks': 0,
			'security/detect-non-literal-fs-filename': 0,
			'security/detect-non-literal-regexp': 0,
			'security/detect-object-injection': 0,
			'security/detect-possible-timing-attacks': 0,
		},
		languageOptions: {
			globals: {
				...globals.es2020,
				...globals.node,
				...globals.mocha,
				__: true,
			},
			parser: ts.parser,
			parserOptions: {
				ecmaVersion: 2020,
				project: true,
			},
		},
	},
	{
		ignores: ['.yarn/', 'app/', 'initpage', '**/build/', '**/dist/', '**/eslint.config.js'],
	}
);
