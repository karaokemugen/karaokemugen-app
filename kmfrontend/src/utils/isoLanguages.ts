import { alpha2ToAlpha3B, getAlpha3BCode, getName, getNames, registerLocale } from '@karaokemugen/i18n-iso-languages';
import de from '@karaokemugen/i18n-iso-languages/langs/de.json';
import en from '@karaokemugen/i18n-iso-languages/langs/en.json';
import es from '@karaokemugen/i18n-iso-languages/langs/es.json';
import fr from '@karaokemugen/i18n-iso-languages/langs/fr.json';
import id from '@karaokemugen/i18n-iso-languages/langs/id.json';
import it from '@karaokemugen/i18n-iso-languages/langs/it.json';
import pt from '@karaokemugen/i18n-iso-languages/langs/pt.json';
import pl from '@karaokemugen/i18n-iso-languages/langs/pl.json';
import ta from '@karaokemugen/i18n-iso-languages/langs/ta.json';
import br from '@karaokemugen/i18n-iso-languages/langs/br.json';
import countries from 'i18n-iso-countries';
import countries_de from 'i18n-iso-countries/langs/de.json';
import countries_en from 'i18n-iso-countries/langs/en.json';
import countries_es from 'i18n-iso-countries/langs/es.json';
import countries_fr from 'i18n-iso-countries/langs/fr.json';
import countries_id from 'i18n-iso-countries/langs/id.json';
import countries_it from 'i18n-iso-countries/langs/it.json';
import countries_pt from 'i18n-iso-countries/langs/pt.json';
import countries_pl from 'i18n-iso-countries/langs/pl.json';
import countries_ta from 'i18n-iso-countries/langs/ta.json';
import countries_br from 'i18n-iso-countries/langs/br.json';

import i18next from 'i18next';

import { nonLatinLanguages } from '../../../src/lib/utils/langs';

countries.registerLocale(countries_en);
countries.registerLocale(countries_es);
countries.registerLocale(countries_fr);
countries.registerLocale(countries_id);
countries.registerLocale(countries_pt);
countries.registerLocale(countries_de);
countries.registerLocale(countries_it);
countries.registerLocale(countries_pl);
countries.registerLocale(countries_ta);
countries.registerLocale(countries_br);

registerLocale(fr);
registerLocale(en);
registerLocale(es);
registerLocale(id);
registerLocale(pt);
registerLocale(de);
registerLocale(it);
registerLocale(pl);
registerLocale(ta);
registerLocale(br);

export const supportedLanguages = ['en', 'fr', 'es', 'id', 'pt', 'de', 'it', 'pl', 'ta', 'br'];
const navigatorLanguage: string = navigator.languages[0].substring(0, 2);
export const langSupport = supportedLanguages.includes(navigatorLanguage) ? navigatorLanguage : 'en';

export const langWithRomanization = nonLatinLanguages;

export function getListLanguagesInLocale(userLang: string): { value: string; label: string }[] {
	const result = [];
	const langs = Object.values(getNames(userLang));
	for (const langInLocale of langs) {
		result.push({ value: getAlpha3BCode(langInLocale, userLang), label: langInLocale });
	}
	result.push({ value: 'qro', label: i18next.t('LANGUAGES.QRO') });
	return result;
}

export function getLanguagesInLocaleFromCode(code: string, userLang: string) {
	if (code === 'qro') return i18next.t('LANGUAGES.QRO');
	return getName(code, userLang);
}

export function getLanguagesInLangFromCode(code: string) {
	return getName(code, code);
}

export function getLanguageIn3B(code) {
	return alpha2ToAlpha3B(code);
}

export function listCountries(userLang: string): { value: string; label: string }[] {
	const listCountries = [];
	for (const [key, value] of Object.entries(countries.getNames(userLang))) {
		listCountries.push({ value: key, label: value });
	}
	return listCountries;
}

export function getCountryName(code: string, userLang: string): string | undefined {
	for (const [key, value] of Object.entries(countries.getNames(userLang || langSupport))) {
		if (key === code) {
			return value as string;
		}
	}
	return undefined;
}
