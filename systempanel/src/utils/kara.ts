import { getNavigatorLanguageIn2B } from '../isoLanguages';
import { DBKaraTag } from '../../../src/lib/types/database/kara';
import { DBPLC } from '../../../src/types/database/playlist';
import { SettingsStoreData } from '../store/types/settings';

const navigatorLanguage:string = getNavigatorLanguageIn2B();

export function getTagInLocale(tag:DBKaraTag) {
	return getTagInLanguage(tag, navigatorLanguage, 'eng');
}

export function getTagInLocaleList(list:Array<DBKaraTag>, i18n?:any) {
	if (list) {
		return list.map((tag:DBKaraTag) => getTagInLanguage(tag, navigatorLanguage, 'eng', i18n));
	} else {
		return [];
	}
}

export function getTagInLanguage (tag:DBKaraTag, mainLanguage:string, fallbackLanguage:string, i18nParam?:any) {
	let i18n = (i18nParam && i18nParam[tag.tid]) ? i18nParam[tag.tid] : tag.i18n;
	if (i18n) {
	  return i18n[mainLanguage] ? i18n[mainLanguage] : 
		  (i18n[fallbackLanguage] ? i18n[fallbackLanguage] : tag.name);
	} else {
		return tag.name;
	}
};

export function getSerieLanguage(settings:SettingsStoreData, tag:DBKaraTag, karaLanguage:string, i18nParam?:any) {
	let user = settings.user;
	let mode:number | undefined = user && user.series_lang_mode;
	if (!user || user.series_lang_mode === -1) {
		mode = settings.config.Frontend.SeriesLanguageMode;
	}

	if (mode === 0) {
		return tag.name;
	} else if (mode === 1) {
		return getTagInLanguage(tag, karaLanguage, 'eng', i18nParam);
	} else if (mode === 2) {
		return getTagInLanguage(tag, settings.state.defaultLocale, 'eng', i18nParam);
	} else if (mode === 3) {
		return getTagInLanguage(tag, navigatorLanguage, 'eng', i18nParam);
	} else if (mode === 4) {
		if (user && user.main_series_lang && user.fallback_series_lang) {
			return getTagInLanguage(tag, user.main_series_lang, user.fallback_series_lang, i18nParam);
		} else {
			return getTagInLanguage(tag, navigatorLanguage, 'eng', i18nParam);
		}
	}
	return tag.name;
};


/**
* Build kara title for users depending on the data
* @param {Object} data - data from the kara
* @return {String} the title
*/
export function buildKaraTitle(settings:SettingsStoreData, data:DBPLC, i18nParam?:any) {
	let isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
	if (data.langs && isMulti) {
		data.langs = [isMulti];
	}
	let serieText = (data.series && data.series.length > 0) ? data.series.map(e => getSerieLanguage(settings, e, data.langs[0].name, i18nParam)).join(', ') 
		: data.singers.map(e => e.name).join(', ');
	let langsText = data.langs.map(e => e.name).join(', ').toUpperCase();
	let songtypeText = data.songtypes.map(e => e.short ? + e.short : e.name).sort().join(' ');
	let songorderText = data.songorder > 0 ? ' ' + data.songorder : '';
	return `${langsText} - ${serieText} - ${songtypeText} ${songorderText} - ${data.title}`
};