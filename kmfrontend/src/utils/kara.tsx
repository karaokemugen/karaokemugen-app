import i18next from 'i18next';
import { ReactNode } from 'react';

import { ASSLine } from '../../../src/lib/types/ass';
import { DBKara, DBKaraTag } from '../../../src/lib/types/database/kara';
import { DBTag } from '../../../src/lib/types/database/tag';
import InlineTag from '../frontend/components/karas/InlineTag';
import { Scope } from '../frontend/types/scope';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from '../store/actions/frontendContext';
import { GlobalContextInterface } from '../store/context';
import { SettingsStoreData } from '../store/types/settings';
import { getLanguageIn3B, langSupport } from './isoLanguages';
import { isRemote } from './socket';
import { getTagTypeName, tagTypes } from './tagTypes';
import { getProtocolForOnline } from './tools';
import {
	KaraLineDisplayElement,
	KaraLineDisplayType,
	KaraLineElement,
	StyleFontType,
} from '../../../src/lib/types/config';

export function getDescriptionInLocale(settings: SettingsStoreData, description: Record<string, string>): string {
	if (!description) return '';
	const user = settings?.user;
	if (user?.language) {
		return description[getLanguageIn3B(user?.language)]
			? description[getLanguageIn3B(user?.language)]
			: description.eng;
	} else {
		return description[getLanguageIn3B(langSupport)] ? description[getLanguageIn3B(langSupport)] : description.eng;
	}
}

export function getTagInLanguage(
	tag: DBKaraTag,
	mainLanguage: string,
	fallbackLanguage: string,
	i18nParam?: Record<string, Record<string, string>>
): { i18n: string; description: string } {
	const i18n = i18nParam && i18nParam[tag.tid] ? i18nParam[tag.tid] : tag.i18n;
	const desc = tag.description;
	let resulti18n = '';
	let resultDescription = null;
	if (i18n) {
		resulti18n = i18n[mainLanguage]
			? i18n[mainLanguage]
			: i18n[fallbackLanguage]
				? i18n[fallbackLanguage]
				: i18n['eng']
					? i18n['eng']
					: tag.name;
	} else {
		resulti18n = tag.name;
	}
	if (desc) {
		resultDescription = desc[mainLanguage]
			? desc[mainLanguage]
			: desc[fallbackLanguage]
				? desc[fallbackLanguage]
				: desc.eng
					? desc.eng
					: null;
	}
	return {
		i18n: resulti18n,
		description: resultDescription,
	};
}

export function getTagInLocaleList(
	settings: SettingsStoreData,
	list: DBKaraTag[],
	i18n?: Record<string, Record<string, string>>
): string[] {
	if (list) {
		return list.map((tag: DBKaraTag) => getTagInLocale(settings, tag, i18n).i18n);
	} else {
		return [];
	}
}

export function getTagInLocale(
	settings: SettingsStoreData,
	tag: DBKaraTag,
	i18nParam?: Record<string, Record<string, string>>
): { i18n: string; description: string } | undefined {
	if (!tag) {
		return undefined;
	}
	const user = settings?.user;
	const tagLang =
		tagTypes[getTagTypeName(tag.type_in_kara ? tag.type_in_kara : (tag as unknown as DBTag).types[0])].language;
	if (tagLang === 'user' && user?.language) {
		return getTagInLanguage(tag, getLanguageIn3B(user.language), 'eng', i18nParam);
	} else if (tagLang === 'song_name' && user?.main_series_lang && user?.fallback_series_lang) {
		return getTagInLanguage(tag, user.main_series_lang, user.fallback_series_lang, i18nParam);
	} else {
		return getTagInLanguage(tag, getLanguageIn3B(langSupport), 'eng', i18nParam);
	}
}

export function getTitleInLocale(
	settings: SettingsStoreData,
	titles: Record<string, string>,
	default_language: string = 'eng'
): string {
	const user = settings?.user;
	if (user?.main_series_lang && user?.fallback_series_lang) {
		return titles[user.main_series_lang]
			? titles[user.main_series_lang]
			: titles[user.fallback_series_lang]
				? titles[user.fallback_series_lang]
				: titles[default_language];
	} else {
		return titles[getLanguageIn3B(langSupport)] ? titles[getLanguageIn3B(langSupport)] : titles[default_language];
	}
}

export function sortTagByPriority(a: DBKaraTag, b: DBKaraTag) {
	return a.priority < b.priority ? 1 : a.name.localeCompare(b.name);
}

/**
 * Tags can have a -1 priority to be hidden from public, and -2 to be hidden everywhere
 * @param {Array} tags array of tags
 * @param {String} scope public or admin
 * @returns {Array} array of tags without hidden tags and sort
 */
export function sortAndHideTags(tags: DBKaraTag[], scope: Scope = 'public'): DBKaraTag[] {
	return tags?.length > 0
		? tags.filter(scope === 'public' ? tag => tag.priority >= 0 : tag => tag.priority >= -1).sort(sortTagByPriority)
		: [];
}

export function getSerieOrSingerGroupsOrSingers(
	settings: SettingsStoreData,
	data: DBKara,
	i18nParam?: Record<string, Record<string, string>>
) {
	if (data.from_display_type && data[data.from_display_type] && data[data.from_display_type].length > 0) {
		return data[data.from_display_type].map(e => getTagInLocale(settings, e, i18nParam).i18n).join(', ');
	}
	if (data.series?.length > 0) {
		return data.series.map(e => getTagInLocale(settings, e, i18nParam).i18n).join(', ');
	}
	if (data.singergroups?.length > 0) {
		return data.singergroups.map(e => getTagInLocale(settings, e, i18nParam).i18n).join(', ');
	}
	return data.singers.map(e => getTagInLocale(settings, e, i18nParam).i18n).join(', ');
}

function buildDisplayTagElement(
	kara: DBKara,
	eType: KaraLineElement,
	display: KaraLineDisplayType,
	style: StyleFontType,
	settings: SettingsStoreData,
	i18nParam?: Record<string, Record<string, string>>
): { text: string; type: string; style?: StyleFontType } {
	if (eType === 'displayType') {
		// This is a joker. from_display_type is a priority setting set by the karaoke itself as to which tag it wants to display.
		eType = kara.from_display_type;
	}
	if (eType === 'title') {
		const title = getTitleInLocale(settings, kara.titles, kara.titles_default_language);
		return {
			text: title,
			type: 'title',
			style,
		};
	} else if (eType === 'songtypes' && kara.songtypes) {
		// Songtypes are specific because we add songorder to them and separate them with spaces instead of commas.
		const tags: string[] = [];
		kara.songtypes = sortAndHideTags(kara.songtypes);
		for (const t of kara.songtypes) {
			if (display === 'i18n') {
				tags.push(getTagInLocale(settings, t, i18nParam).i18n);
			} else if (display === 'short') {
				tags.push(t.short?.toUpperCase() || t.name);
			}
		}
		const text = tags.length > 0 ? tags.join(' ') + (kara.songorder ? ` ${kara.songorder}` : '') : '';
		return {
			text,
			type: 'songtypes',
			style,
		};
	} else if (kara[eType]) {
		kara[eType] = sortAndHideTags(kara[eType]);
		const tags = [];
		for (const t of kara[eType]) {
			if (display === 'i18n') {
				tags.push(getTagInLocale(settings, t, i18nParam).i18n);
			} else if (display === 'short') {
				// New rule! All shorts are uppercased
				tags.push(t.short?.toUpperCase() || t.name);
			}
		}
		const text = tags.length > 0 ? tags.slice(0, 3).join(', ') + (tags.length > 3 ? '...' : '') : '';
		return {
			text,
			type: eType,
			style,
		};
	}
}

function buildDisplayElement(
	kara: DBKara,
	e: KaraLineDisplayElement,
	settings: SettingsStoreData,
	i18nParam?: Record<string, Record<string, string>>
): { text: string; type: string; style?: StyleFontType } {
	if (Array.isArray(e.type)) {
		// If type is an array, we pick the first element that contains data
		for (const eType of e.type) {
			// If an element exists, we break from this loop.
			const element = buildDisplayTagElement(kara, eType, e.display, e.style, settings, i18nParam);
			if (element?.text) {
				return element;
			}
		}
	} else {
		return buildDisplayTagElement(kara, e.type, e.display, e.style, settings, i18nParam);
	}
}

/**
 * Build kara title for users depending on the data
 * @param {Object} data - data from the kara
 * @param {boolean} onlyText - if only text and no component
 * @return {String} the title
 */
export function buildKaraTitle(
	settings: SettingsStoreData,
	data: DBKara,
	onlyText?: boolean,
	i18nParam?: Record<string, Record<string, string>>
): string | ReactNode {
	// In case of multi-languages song (with language MUL) it takes priority and removes all other languages
	const isMulti = data?.langs?.find(e => e.name.indexOf('mul') > -1);
	if (data?.langs && isMulti) {
		data.langs = [isMulti];
	}
	const displayLine = settings.config.Frontend.Library.KaraLineDisplay;
	const karaLine = [];
	for (const e of displayLine) {
		const displayElement = buildDisplayElement(data, e, settings, i18nParam);
		if (displayElement?.text) karaLine.push(displayElement);
	}
	if (onlyText) {
		const versions = sortAndHideTags(data?.versions).map(t => `[${getTagInLocale(settings, t, i18nParam).i18n}]`);
		const version = versions?.length > 0 ? ` ${versions.join(' ')}` : '';
		return `${karaLine.map(e => e.text).join(' - ')} ${version}`;
	} else {
		const versions = sortAndHideTags(data?.versions).map(t => (
			<span className="tag inline white" key={t.tid}>
				{getTagInLocale(settings, t, i18nParam).i18n}
			</span>
		));
		return (
			<>
				{karaLine.map((e, i) => (
					<span key={i}>
						{!!i && e.text && <span>&nbsp;-&nbsp;</span>}
						<span className={e.style ? `${e.style}` : ''}>{e.text}</span>
					</span>
				))}
				{versions}
			</>
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
				const lastLines = val[val.length - 1];
				const lastLine = lastLines[lastLines.length - 1];
				if (lyric.start - lastLine.end < 0.1) {
					lastLines.push(lyric);
					val[val.length - 1] = lastLines;
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
				fixedLyrics.push({
					start: lyricGroup[0].start,
					text: lyric,
					fullText: lyricGroup[0].fullText,
					end: lyricGroup[lyricGroup.length - 1].end,
				});
			}
		}
		fixedLyrics.sort((el1, el2) => {
			return el1.start - el2.start;
		});
	}
	// Compute karaoke timings for public LyricsBox
	const mappedLyrics: ASSLine[] = [];
	for (const lyric of lyrics) {
		if (lyric.fullText) {
			const newFullText = lyric.fullText
				.map(value => {
					// Crush down tags
					const tags = value.tags.reduce((acc, tagCollec) => {
						const newK = (acc.k || 0) + (tagCollec.k || tagCollec.kf || tagCollec.ko || 0);
						return Object.assign(acc, { ...tagCollec, k: newK });
					}, {});
					return { ...value, tags };
				})
				.map((block, i, blocks) => {
					let KTime = 0;
					for (let i2 = 0; i2 < i; i2++) {
						KTime += blocks[i2].tags?.k || 0;
					}
					KTime = KTime * 0.01;
					return { ...block, tags: [{ ...block.tags, k: KTime }] };
				});
			mappedLyrics.push({ ...lyric, fullText: newFullText });
		} else {
			// Push as-is, no support
			mappedLyrics.push({ ...lyric, fullText: undefined });
		}
	}
	return mappedLyrics;
}

export function getPreviewLink(kara: DBKara, context: GlobalContextInterface) {
	const path = getPreviewPath({ contentid: kara.kid, mediasize: kara.mediasize });
	if (isRemote() || kara.download_status !== 'DOWNLOADED') {
		return `${getProtocolForOnline(context, kara.repository)}://${kara.repository}${path}`;
	} else {
		return path;
	}
}

export function getPreviewPath(options: { contentid: string; mediasize: number }) {
	return `/previews/${options.contentid}.${options.mediasize}.25.jpg`;
}

export function getPlaylistInfo(side: 'left' | 'right', context: GlobalContextInterface) {
	if (side === 'left') {
		return context.globalState.frontendContext.playlistInfoLeft;
	} else {
		return context.globalState.frontendContext.playlistInfoRight;
	}
}

export function getOppositePlaylistInfo(side: 'left' | 'right', context: GlobalContextInterface) {
	if (side === 'right') {
		return context.globalState.frontendContext.playlistInfoLeft;
	} else {
		return context.globalState.frontendContext.playlistInfoRight;
	}
}

export function setPlaylistInfo(side: 'left' | 'right', context: GlobalContextInterface, plaid?: string) {
	const oldIdPlaylist = getPlaylistInfo(side, context)?.plaid;
	if (plaid === getOppositePlaylistInfo(side, context)?.plaid) {
		if (side === 'left') {
			setPlaylistInfoRight(context.globalDispatch, oldIdPlaylist);
		} else {
			setPlaylistInfoLeft(context.globalDispatch, oldIdPlaylist);
		}
	}
	if (side === 'left') {
		setPlaylistInfoLeft(context.globalDispatch, plaid);
	} else {
		setPlaylistInfoRight(context.globalDispatch, plaid);
	}
}

export function setOppositePlaylistInfo(side: 'left' | 'right', context: GlobalContextInterface, plaid?: string) {
	const oldIdPlaylist = getOppositePlaylistInfo(side, context)?.plaid;
	if (plaid === getPlaylistInfo(side, context)?.plaid) {
		if (side === 'left') {
			setPlaylistInfoLeft(context.globalDispatch, oldIdPlaylist);
		} else {
			setPlaylistInfoRight(context.globalDispatch, oldIdPlaylist);
		}
	}
	if (side === 'left') {
		setPlaylistInfoRight(context.globalDispatch, plaid);
	} else {
		setPlaylistInfoLeft(context.globalDispatch, plaid);
	}
}

function getInlineTag(e: DBKaraTag, tagType: number, scope: 'admin' | 'public', i18nParam?: Record<string, string>) {
	return (
		<InlineTag
			key={e.tid}
			scope={scope}
			tag={e}
			tagType={tagType}
			className={tagType === 15 ? 'problematicTag' : 'inlineTag'}
			i18nParam={i18nParam}
		/>
	);
}

export function computeTagsElements(
	kara: DBKara,
	scope: Scope,
	settings: SettingsStoreData,
	versions = true,
	i18nParam?: Record<string, string>
) {
	// Tags in the header
	const karaTags: ReactNode[] = [];

	if (kara.langs) {
		const isMulti = kara.langs.find(e => e.name.indexOf('mul') > -1);
		if (isMulti) {
			karaTags.push(
				<div key={isMulti.tid} className="tag black">
					{getInlineTag(isMulti, tagTypes.LANGS.type, scope, i18nParam)}
				</div>
			);
		} else {
			karaTags.push(
				...sortAndHideTags(kara.langs, scope).map(tag => {
					return (
						<div key={tag.tid} className="tag black" title={tag.short ? tag.short : tag.name}>
							{getInlineTag(tag, tagTypes.LANGS.type, scope, i18nParam)}
						</div>
					);
				})
			);
		}
	}
	if (kara.songtypes) {
		karaTags.push(
			...sortAndHideTags(kara.songtypes, scope).map(tag => {
				return (
					<div key={tag.tid} className="tag green" title={tag.short ? tag.short : tag.name}>
						{getInlineTag(tag, tagTypes.SONGTYPES.type, scope, i18nParam)}
						{kara.songorder > 0 ? ' ' + kara.songorder : ''}
					</div>
				);
			})
		);
	}

	const types = settings.config.Frontend.Library.KaraLineDisplay.filter(
		v => v.display === 'tag' && v.type === 'versions'
	).map(e => (e.type as string).toUpperCase());
	if (versions) {
		types.push('VERSIONS');
	}

	for (const type of types) {
		const tagData = tagTypes[type];
		if (kara[tagData.karajson]) {
			karaTags.push(
				...sortAndHideTags(kara[tagData.karajson], scope).map(tag => {
					return (
						<div key={tag.tid} className={`tag ${tagData.color}`} title={tag.short ? tag.short : tag.name}>
							{getInlineTag(tag, tagData.type, scope, i18nParam)}
						</div>
					);
				})
			);
		}
	}

	// Tags in the page/modal itself (singers, singersgroups, songwriters, creators, karaoke authors)
	const karaBlockTags: ReactNode[] = [];
	for (const type of ['SINGERS', 'SINGERGROUPS', 'SONGWRITERS', 'CREATORS', 'AUTHORS']) {
		let key = 0;
		const tagData = tagTypes[type];
		if (kara[tagData.karajson]?.length > 0) {
			karaBlockTags.push(
				<div className={`detailsKaraLine colored ${tagData.color}`} key={tagData.karajson}>
					<i className={`fas fa-${tagData.icon}`} />
					<div>
						{i18next.t(`KARA.${type}_BY`)}
						<span key={`${type}${key}`} className="detailsKaraLineContent">
							{' '}
							{kara[tagData.karajson]
								.map(e => getInlineTag(e, tagData.type, scope))
								.reduce(
									(acc, x, index, arr): any =>
										acc === null
											? [x]
											: [
													acc,
													index + 1 === arr.length ? (
														<span
															key={`${type}${key}`}
															className={`colored ${tagData.color}`}
														>
															{' '}
															{i18next.t('AND')}{' '}
														</span>
													) : (
														<span
															key={`${type}${key}`}
															className={`colored ${tagData.color}`}
														>
															,{' '}
														</span>
													),
													x,
												],
									null
								)}
						</span>
					</div>
				</div>
			);
			key++;
		}
	}

	return [karaTags, karaBlockTags];
}
