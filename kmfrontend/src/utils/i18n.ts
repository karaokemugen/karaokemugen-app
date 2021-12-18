import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
const en = require('../locales/en.json');
const fr = require('../locales/fr.json');
const es = require('../locales/es.json');

i18n
	// use react-i18next
	// doc: https://react.i18next.com/
	.use(initReactI18next)
	// init i18next
	// for all options read: https://www.i18next.com/overview/configuration-options
	.init({
		load: 'languageOnly',
		fallbackLng: 'en',

		interpolation: {
			escapeValue: false, // not needed for react as it escapes by default
		},
		resources: {
			en: {
				translation: en,
			},
			fr: {
				translation: fr,
			},
			es: {
				translation: es,
			},
		},
	});

export default i18n;
