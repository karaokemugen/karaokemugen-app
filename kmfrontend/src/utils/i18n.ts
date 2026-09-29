import i18n from 'i18next';
import type { BackendModule, ReadCallback, ResourceKey } from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../locales/en.json';

// Use english as default fallback language; The other langs are lazy-loaded as chunks
const lazyLocales: Record<string, () => Promise<{ default: ResourceKey }>> = {
	br: () => import('../locales/br.json'),
	cs: () => import('../locales/cs.json'),
	de: () => import('../locales/de.json'),
	es: () => import('../locales/es.json'),
	fr: () => import('../locales/fr.json'),
	id: () => import('../locales/id.json'),
	it: () => import('../locales/it.json'),
	pl: () => import('../locales/pl.json'),
	pt: () => import('../locales/pt.json'),
	ru: () => import('../locales/ru.json'),
	ta: () => import('../locales/ta.json'),
};

const lazyLocalesBackend: BackendModule = {
	type: 'backend',
	init: () => { },
	read: (language: string, _namespace: string, callback: ReadCallback) => {
		const loadLocale = lazyLocales[language];
		if (!loadLocale) {
			// Returning empty will take fallback language
			callback(null, {});
			return;
		}
		loadLocale().then(
			locale => callback(null, locale.default),
			error => callback(error, false) // "false" avoids retrying to fetch the chunk
		);
	},
};

i18n
	// load locales lazily
	.use(lazyLocalesBackend)
	// use react-i18next
	// doc: https://react.i18next.com/
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		load: 'languageOnly',
		fallbackLng: {
			br: ['fr'],
			default: ['en'],
		},
		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		},
		partialBundledLanguages: true,
		resources: {
			en: {
				translation: en,
			},
		},
	});

export default i18n;
