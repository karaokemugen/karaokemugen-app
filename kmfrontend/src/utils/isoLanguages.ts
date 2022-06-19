import { getCountries } from '@hotosm/iso-countries-languages';
import { alpha2ToAlpha3B, getAlpha3BCode, getName, getNames, registerLocale } from '@karaokemugen/i18n-iso-languages';
import en from '@karaokemugen/i18n-iso-languages/langs/en.json';
import es from '@karaokemugen/i18n-iso-languages/langs/es.json';
import fr from '@karaokemugen/i18n-iso-languages/langs/fr.json';
import id from '@karaokemugen/i18n-iso-languages/langs/id.json';
import pt from '@karaokemugen/i18n-iso-languages/langs/pt.json';

registerLocale(fr);
registerLocale(en);
registerLocale(es);
registerLocale(id);
registerLocale(pt);

export const languagesSupport = ['en', 'fr', 'es', 'id', 'pt'];
const navigatorLanguage: string = navigator.languages[0].substring(0, 2);
export const langSupport = languagesSupport.includes(navigatorLanguage) ? navigatorLanguage : 'en';

export const langWithRomanization = [
	'amh', // amharic
	'ara', // arabic
	'arm', // armenian
	'bel', // belarusian
	'ben', // bengali
	'bul', // bulgarian
	'chi', // chinese
	'geo', // georgian
	'gre', // greek
	'guj', // gujarati
	'heb', // hebrew
	'hin', // hindi
	'ind', // indonesian
	'jpn', // japanese
	'kan', // kannada
	'khm', // kmher
	'kir', // kyrgyz
	'kor', // korean
	'mac', // macedonian
	'mal', // malayalam
	'mar', // marathi
	'mon', // mongolian
	'nep', // nepali
	'ori', // oriya
	'pan', // punjabi
	'per', // persian
	'pus', // pashto
	'rus', // russian
	'san', // sanskrit
	'srp', // serbian
	'tam', // tamil
	'tel', // telugu
	'tha', // thai
	'tib', // tibetan
	'tir', // tigrinya
	'tur', // turk
	'ukr', // ukrainian
	'urd', // urdu
	'vie', // vietnamese
];

export function getListLanguagesInLocale(userLang: string): { value: string; label: string }[] {
	const result = [];
	const langs = Object.values(getNames(userLang));
	for (const langInLocale of langs) {
		result.push({ value: getAlpha3BCode(langInLocale, userLang), label: langInLocale });
	}
	return result;
}

export function getLanguagesInLocaleFromCode(code: string, userLang: string) {
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
	for (const [key, value] of Object.entries(getCountries(userLang))) {
		listCountries.push({ value: key, label: value });
	}
	return listCountries;
}

export function getCountryName(code: string, userLang: string): string | undefined {
	for (const [key, value] of Object.entries(getCountries(userLang || langSupport))) {
		if (key === code) {
			return value as string;
		}
	}
	return undefined;
}
