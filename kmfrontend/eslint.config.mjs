import js from '@eslint/js';
import ts from 'typescript-eslint';
import react from 'eslint-plugin-react';
import security from 'eslint-plugin-security';
import prettierConfig from 'eslint-config-prettier';
import globals from 'globals';

export default ts.config(
	js.configs.recommended,
	ts.configs.recommended,
	react.configs.recommended,
	security.configs.recommended,
	prettierConfig,
	{
		ignores: ['dist/'],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2020,
			},
			parser: ts.parser,
		},
		rules: {
			'react/react-in-jsx-scope': 'off',
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
	}
);
