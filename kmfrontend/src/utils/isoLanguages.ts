import languages from '@karaokemugen/i18n-iso-languages';
import isoCountriesLanguages from 'iso-countries-languages';

languages.registerLocale(require('@karaokemugen/i18n-iso-languages/langs/fr.json'));
languages.registerLocale(require('@karaokemugen/i18n-iso-languages/langs/en.json'));
languages.registerLocale(require('@karaokemugen/i18n-iso-languages/langs/es.json'));

export const languagesSupport = ['en', 'fr', 'es'];
const navigatorLanguage: string = navigator.languages[0].substring(0, 2);
export const langSupport = languagesSupport.includes(navigatorLanguage) ? navigatorLanguage : 'en';

export function getListLanguagesInLocale(): { value: string; label: string }[] {
	const result = [];
	const langs = Object.values(languages.getNames(langSupport));
	for (const langInLocale of langs) {
		result.push({ value: languages.getAlpha3BCode(langInLocale, langSupport), label: langInLocale });
	}
	return result;
}

export function getLanguagesInLocaleFromCode(code: string) {
	return languages.getName(code, langSupport);
}

export function getLanguagesInLangFromCode(code: string) {
	return languages.getName(code, code);
}

export function getLanguageIn3B(code) {
	return languages.alpha2ToAlpha3B(code);
}

export function listCountries(): { value: string; label: string }[] {
	const listCountries = [];
	for (const [key, value] of Object.entries(isoCountriesLanguages.getCountries(langSupport))) {
		listCountries.push({ value: key, label: value });
	}
	return listCountries;
}

export function getCountryName(code: string): string | undefined {
	for (const [key, value] of Object.entries(isoCountriesLanguages.getCountries(langSupport))) {
		if (key === code) {
			return value as string;
		}
	}
	return undefined;
}
