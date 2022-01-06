module.exports = {
	input: ['src/**/*.{ts,tsx}'],
	output: './',
	options: {
		debug: true,
		removeUnusedKeys: false,
		func: {
			list: ['i18next.t', 'i18n.t'],
			extensions: ['.ts', '.tsx'],
		},
		lngs: ['en', 'fr', 'es', 'id'],
		defaultLng: 'en',
		defaultValue: '__STRING_NOT_TRANSLATED__',
		resource: {
			loadPath: 'src/locales/{{lng}}.json',
			savePath: 'src/locales/{{lng}}.json',
			jsonIndent: 2,
			lineEnding: '\n',
		},
		interpolation: {
			prefix: '{{',
			suffix: '}}',
		},
	},
};
