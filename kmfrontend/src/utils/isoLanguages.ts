import { getCountries } from '@hotosm/iso-countries-languages';
import { alpha2ToAlpha3B, getAlpha3BCode, getName, getNames, registerLocale } from '@karaokemugen/i18n-iso-languages';
import en from '@karaokemugen/i18n-iso-languages/langs/en.json';
import es from '@karaokemugen/i18n-iso-languages/langs/es.json';
import fr from '@karaokemugen/i18n-iso-languages/langs/fr.json';
import id from '@karaokemugen/i18n-iso-languages/langs/id.json';

registerLocale(fr);
registerLocale(en);
registerLocale(es);
registerLocale(id);

export const languagesSupport = ['en', 'fr', 'es', 'id'];
const navigatorLanguage: string = navigator.languages[0].substring(0, 2);
export const langSupport = languagesSupport.includes(navigatorLanguage) ? navigatorLanguage : 'en';

export function getListLanguagesInLocale(): { value: string; label: string }[] {
	const result = [];
	const langs = Object.values(getNames(langSupport));
	for (const langInLocale of langs) {
		result.push({ value: getAlpha3BCode(langInLocale, langSupport), label: langInLocale });
	}
	return result;
}

export function getLanguagesInLocaleFromCode(code: string) {
	return getName(code, langSupport);
}

export function getLanguagesInLangFromCode(code: string) {
	return getName(code, code);
}

export function getLanguageIn3B(code) {
	return alpha2ToAlpha3B(code);
}

export function listCountries(): { value: string; label: string }[] {
	const listCountries = [];
	for (const [key, value] of Object.entries(getCountries(langSupport))) {
		listCountries.push({ value: key, label: value });
	}
	return listCountries;
}

export function getCountryName(code: string): string | undefined {
	for (const [key, value] of Object.entries(getCountries(langSupport))) {
		if (key === code) {
			return value as string;
		}
	}
	return undefined;
}
