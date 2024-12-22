import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import de from '../locales/de.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import fr from '../locales/fr.json';
import id from '../locales/id.json';
import it from '../locales/it.json';
import pt from '../locales/pt.json';
import pl from '../locales/pl.json';

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
			id: {
				translation: id,
			},
			pt: {
				translation: pt,
			},
			de: {
				translation: de,
			},
			it: {
				translation: it,
			},
			pl: {
				translation: pl,
			},
		},
	});

export default i18n;
