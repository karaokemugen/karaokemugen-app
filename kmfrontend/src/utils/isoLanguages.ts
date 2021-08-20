import languages from '@karaokemugen/i18n-iso-languages';
import isoCountriesLanguages from 'iso-countries-languages';

// Support french & english languages.
languages.registerLocale(require('@karaokemugen/i18n-iso-languages/langs/fr.json'));
languages.registerLocale(require('@karaokemugen/i18n-iso-languages/langs/en.json'));

export const languagesSupport = ['en', 'fr'];
const navigatorLanguage: string = navigator.languages[0].substring(0, 2);
export const langSupport = languagesSupport.includes(navigatorLanguage) ? navigatorLanguage : 'en';

export function getListLanguagesInLocale(): Array<{ value: string, text: string }> {
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

export function getNavigatorLanguageIn3B() {
	return languages.alpha2ToAlpha3B(navigatorLanguage);
}

export function getLanguageIn3B(code) {
	return languages.alpha2ToAlpha3B(code);
}

export function listCountries(): Array<{ value: string, text: string }> {
	const listCountries = [];
	for (const [key, value] of Object.entries(isoCountriesLanguages.getCountries(navigatorLanguage))) {
		listCountries.push({ value: key, label: value });
	}
	return listCountries;
}

export function getCountryName(code: string): string | undefined {
	for (const [key, value] of Object.entries(isoCountriesLanguages.getCountries(navigatorLanguage))) {
		if (key === code) {
			return value as string;
		}
	}
	return undefined;
}
