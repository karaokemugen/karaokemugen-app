import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
const en = require('../locales/en.json');
const fr = require('../locales/fr.json');

i18n
	// detect user language
	// learn more: https://github.com/i18next/i18next-browser-languageDetector
	.use(LanguageDetector)
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
				translation: en
			},
			fr: {
				translation: fr
			}
		}
	});


export default i18n;
