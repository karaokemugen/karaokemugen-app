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
		lngs: ['en', 'fr', 'es', 'id', 'pt', 'de', 'it', 'pl', 'ta', 'br'],
		defaultLng: 'en',
		defaultValue: '__STRING_NOT_TRANSLATED__',
		resource: {
			loadPath: 'locales/{{lng}}.json',
			savePath: 'locales/{{lng}}.json',
			jsonIndent: 2,
			lineEnding: '\n',
		},
		interpolation: {
			prefix: '{{',
			suffix: '}}',
		},
	},
};
