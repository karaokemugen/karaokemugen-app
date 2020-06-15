import languages from "@cospired/i18n-iso-languages";

// Support french & english languages.
languages.registerLocale(require("@cospired/i18n-iso-languages/langs/fr.json"));
languages.registerLocale(require("@cospired/i18n-iso-languages/langs/en.json"));

const languagesSupport=['en','fr'];
const navigatorLanguage:string = navigator.languages[0].substring(0, 2);
const langSupport = languagesSupport.includes(navigatorLanguage) ? navigatorLanguage : 'eng';

export function getListLanguagesInLocale():Array<{value:string, text:string}> {
	let result = [];
	let langs = Object.values(languages.getNames(langSupport));
	langs.forEach(langInLocale => {
		result.push({value: languages.getAlpha3BCode(langInLocale, langSupport), text: langInLocale});
	});
	return result;
}

export function getLanguagesInLocaleFromCode(code:string) {
	return languages.getName(code, langSupport);
}

export function getNavigatorLanguageIn2B() {
	return languages.alpha2ToAlpha3B(navigatorLanguage);
}