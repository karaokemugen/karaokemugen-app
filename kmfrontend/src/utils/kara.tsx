import React from 'react';

import {ASSLine} from '../../../src/lib/types/ass';
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

export function getTagInLocaleList(settings:SettingsStoreData, list: Array<DBKaraTag>, i18n?: any): string[] {
	if (list) {
		return list.map((tag: DBKaraTag) => getTagInLocale(settings, tag, i18n));
	} else {
		return [];
	}
}

export function getTagInLocale(settings:SettingsStoreData, tag: DBKaraTag, i18nParam?: any): any {
	const user = settings?.user;
	if (user?.main_series_lang && user?.fallback_series_lang) {
		return getTagInLanguage(tag, user.main_series_lang, user.fallback_series_lang, i18nParam);
	} else {
		return getTagInLanguage(tag, navigatorLanguage, 'eng', i18nParam);
	}
}

export function getTitleInLocale(settings:SettingsStoreData, titles: any): any {
	const user = settings?.user;
	if (user?.main_series_lang && user?.fallback_series_lang) {
		return titles[user.main_series_lang] ? titles[user.main_series_lang] :
			(titles[user.fallback_series_lang] ? titles[user.fallback_series_lang] : titles['eng']);
	} else {
		return titles[navigatorLanguage] ? titles[navigatorLanguage] : titles['eng'];
	}
}

export function sortTagByPriority(a: any, b: any) {
	return a.priority < b.priority ? 1 : a.name.localeCompare(b.name);
}

/**
* Build kara title for users depending on the data
* @param {Object} data - data from the kara
* @param {boolean} onlyText - if only text and no component
* @return {String} the title
*/
export function buildKaraTitle(settings:SettingsStoreData, data: DBKara, onlyText?: boolean, i18nParam?: any): string|React.ReactFragment {
	const isMulti = data?.langs.find(e => e.name.indexOf('mul') > -1);
	if (data?.langs && isMulti) {
		data.langs = [isMulti];
	}
	const serieText = data?.series?.length > 0 ? data.series.map(e => getTagInLocale(settings, e, i18nParam)).join(', ')
		+ (data.series.length > 3 ? '...' : '')
		: (data?.singers ? data.singers.slice(0, 3).map(e => e.name).join(', ') + (data.singers.length > 3 ? '...' : '') : '');
	const langsText = data?.langs.map(e => e.name).join(', ').toUpperCase();
	const songtypeText = data?.songtypes.sort(sortTagByPriority).map(e => e.short ? + e.short : e.name).join(' ');
	const songorderText = data?.songorder > 0 ? ' ' + data.songorder : '';
	if (onlyText) {
		const versions = data?.versions?.sort(sortTagByPriority).map(t => `[${getTagInLocale(settings, t, i18nParam)}]`);
		const version = versions?.length > 0
			? ` ${versions.join(' ')}`
			: '';
		return `${langsText} - ${serieText} - ${songtypeText} ${songorderText} - ${getTitleInLocale(settings, data.titles)} ${version}`;
	} else {
		const versions = data?.versions?.sort(sortTagByPriority).map(t =>
			<span className="tag inline white" key={t.tid}>{getTagInLocale(settings, t, i18nParam)}</span>
		);
		return (
			<React.Fragment>
				<span>{langsText}</span>
				<span>&nbsp;-&nbsp;</span>
				<span className="karaTitleSerie">{serieText}</span>
				<span>&nbsp;-&nbsp;</span>
				<span>{`${songtypeText} ${songorderText}`}</span>
				<span>&nbsp;-&nbsp;</span>
				<span className="karaTitleTitle">{getTitleInLocale(settings, data.titles)}</span>
				{versions}
			</React.Fragment>
		);
	}
}

export function formatLyrics(lyrics: ASSLine[]) {
	if (lyrics.length > 100) {
		// Merge lines with the same text in it to mitigate karaokes with many effects
		const map = new Map<string, ASSLine[][]>();
		for (const lyric of lyrics) {
			if (map.has(lyric.text)) {
				const val = map.get(lyric.text);
				const lastLines = val[val.length-1];
				const lastLine = lastLines[lastLines.length-1];
				if (lyric.start - lastLine.end < 0.1) {
					lastLines.push(lyric);
					val[val.length-1] = lastLines;
				} else {
					val.push([lyric]);
				}
				map.set(lyric.text, val);
			} else {
				map.set(lyric.text, [[lyric]]);
			}
		}
		// Unwrap and sort
		const fixedLyrics: ASSLine[] = [];
		for (const [lyric, lyricGroups] of map.entries()) {
			for (const lyricGroup of lyricGroups) {
				fixedLyrics.push({ start: lyricGroup[0].start, text: lyric, end: lyricGroup[lyricGroup.length-1].end });
			}
		}
		fixedLyrics.sort((el1, el2) => {
			return el1.start - el2.start;
		});
		return fixedLyrics;
	} else {
		// Compute karaoke timings for public LyricsBox
		const mappedLyrics: ASSLine[] = [];
		for (const lyric of lyrics) {
			if (lyric.fullText) {
				const newFullText = lyric.fullText.map(value => {
					// Crush down tags
					const tags = value.tags.reduce((acc, tagCollec) => {
						const newK = (acc.k || 0) + (tagCollec.k || tagCollec.kf || tagCollec.ko || 0);
						return Object.assign(acc, {...tagCollec, k: newK});
					}, {});
					return {...value, tags};
				}).map((block, i, blocks) => {
					let KTime = 0;
					for (let i2 = 0; i2 < i; i2++) {
						KTime += blocks[i2].tags?.k || 0;
					}
					KTime = KTime * 0.01;
					return {...block, tags: [{...block.tags, k: KTime}]};
				});
				mappedLyrics.push({...lyric, fullText: newFullText});
			} else {
				// Push as-is, no support
				mappedLyrics.push({...lyric, fullText: undefined});
			}
		}
		return mappedLyrics;
	}
}

export function getPreviewLink(kara: DBKara) {
	if (isRemote() || kara.download_status !== 'DOWNLOADED') {
		return `https://${kara.repository}/previews/${kara.kid}.${kara.mediasize}.25.jpg`;
	} else {
		return `/previews/${kara.kid}.${kara.mediasize}.25.jpg`;
	}
}
