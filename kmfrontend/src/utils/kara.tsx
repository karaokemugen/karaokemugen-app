import React from 'react';

import { DBKara, DBKaraTag } from '../../../src/lib/types/database/kara';
import { SettingsStoreData } from '../store/types/settings';
import { getNavigatorLanguageIn3B } from './isoLanguages';
import { isRemote } from './socket';

const navigatorLanguage: string = getNavigatorLanguageIn3B();

export function getTagInLanguage(tag: DBKaraTag, mainLanguage: string, fallbackLanguage: string, i18nParam?: any): string {
	const i18n = (i18nParam && i18nParam[tag.tid]) ? i18nParam[tag.tid] : tag.i18n;
	if (i18n) {
		return i18n[mainLanguage] ? i18n[mainLanguage] :
			(i18n[fallbackLanguage] ? i18n[fallbackLanguage] : tag.name);
	} else {
		return tag.name;
	}
}

export function getTagInLocale(tag: DBKaraTag, i18nParam?: any): string {
	return getTagInLanguage(tag, navigatorLanguage, 'eng', i18nParam);
}

export function getTagInLocaleList(list: Array<DBKaraTag>, i18n?: any): string[] {
	if (list) {
		return list.map((tag: DBKaraTag) => getTagInLanguage(tag, navigatorLanguage, 'eng', i18n));
	} else {
		return [];
	}
}

export function getSerieLanguage(settings:SettingsStoreData, tag: DBKaraTag, karaLanguage: string, i18nParam?: any): any {
	const user = settings.user;
	let mode: number | undefined = user && user.series_lang_mode;
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
}

export function sortTagByPriority(a: any, b: any) {
	return a.priority < b.priority ? 1 : -1;
}

/**
* Build kara title for users depending on the data
* @param {Object} data - data from the kara
* @param {boolean} onlyText - if only text and no component
* @return {String} the title
*/
export function buildKaraTitle(settings:SettingsStoreData, data: DBKara, onlyText?: boolean, i18nParam?: any): string|React.ReactFragment {
	const isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
	if (data.langs && isMulti) {
		data.langs = [isMulti];
	}
	const serieText = data.series?.length > 0 ? data.series.map(e => getSerieLanguage(settings, e, data.langs[0].name, i18nParam)).join(', ')
		+ (data.series.length > 3 ? '...' : '')
		: (data.singers ? data.singers.slice(0, 3).map(e => e.name).join(', ') + (data.singers.length > 3 ? '...' : '') : '');
	const langsText = data.langs.map(e => e.name).join(', ').toUpperCase();
	const songtypeText = data.songtypes.sort(sortTagByPriority).map(e => e.short ? + e.short : e.name).join(' ');
	const songorderText = data.songorder > 0 ? ' ' + data.songorder : '';
	if (onlyText) {
		const versions = data.versions?.sort(sortTagByPriority).map(t => `[${getTagInLocale(t, i18nParam)}]`);
		const version = versions?.length > 0
			? ` ${versions.join(' ')}`
			: '';
		return `${langsText} - ${serieText} - ${songtypeText} ${songorderText} - ${data.title} ${version}`;
	} else {
		const versions = data.versions?.sort(sortTagByPriority).map(t => <span className="tag inline white" key={t.tid}>{getTagInLocale(t, i18nParam)}</span>);
		return (
			<React.Fragment>
				<span>{langsText}</span>
				<span>&nbsp;-&nbsp;</span>
				<span className="karaTitleSerie">{serieText}</span>
				<span>&nbsp;-&nbsp;</span>
				<span>{`${songtypeText} ${songorderText}`}</span>
				<span>&nbsp;-&nbsp;</span>
				<span className="karaTitleTitle">{data.title}</span>
				{versions}
			</React.Fragment>
		);
	}
}

export function getPreviewLink(kara: DBKara) {
	if (isRemote()) {
		return `https://${kara.repository}/previews/${kara.kid}.${kara.mediasize}.25.jpg`;
	} else {
		return `/previews/${kara.kid}.${kara.mediasize}.25.jpg`;
	}
}
