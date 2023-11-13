import i18next from 'i18next';
import { ReactNode } from 'react';
import { ASSLine } from '../../../src/lib/types/ass';
import { DBKara, DBKaraTag } from '../../../src/lib/types/database/kara';
import InlineTag from '../frontend/components/karas/InlineTag';
import { Scope } from '../frontend/types/scope';
import { setPlaylistInfoLeft, setPlaylistInfoRight } from '../store/actions/frontendContext';
import { GlobalContextInterface } from '../store/context';
import { SettingsStoreData } from '../store/types/settings';
import { getLanguageIn3B, langSupport } from './isoLanguages';
import { isRemote } from './socket';
import { tagTypes } from './tagTypes';

export function getDescriptionInLocale(settings: SettingsStoreData, description: Record<string, string>): string {
	if (!description) return '';
	const user = settings?.user;
	if (user?.main_series_lang && user?.fallback_series_lang) {
		return description[user.main_series_lang]
			? description[user.main_series_lang]
			: description[user.fallback_series_lang]
			? description[user.fallback_series_lang]
			: description.eng;
	} else {
		return description[getLanguageIn3B(langSupport)] ? description[getLanguageIn3B(langSupport)] : description.eng;
	}
}

export function getTagInLanguage(
	tag: DBKaraTag,
	mainLanguage: string,
	fallbackLanguage: string,
	i18nParam?: any
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
			: i18n.eng
			? i18n.eng
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

export function getTagInLocaleList(settings: SettingsStoreData, list: DBKaraTag[], i18n?: any): string[] {
	if (list) {
		return list.map((tag: DBKaraTag) => getTagInLocale(settings, tag, i18n).i18n);
	} else {
		return [];
	}
}

export function getTagInLocale(
	settings: SettingsStoreData,
	tag: DBKaraTag,
	i18nParam?: any
): { i18n: string; description: string } | undefined {
	const user = settings?.user;
	if (!tag) {
		return undefined;
	} else if (user?.main_series_lang && user?.fallback_series_lang) {
		return getTagInLanguage(tag, user.main_series_lang, user.fallback_series_lang, i18nParam);
	} else {
		return getTagInLanguage(tag, getLanguageIn3B(langSupport), 'eng', i18nParam);
	}
}

export function getTitleInLocale(
	settings: SettingsStoreData,
	titles: Record<string, string>,
	default_language: string = 'eng'
): any {
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

export function sortTagByPriority(a: any, b: any) {
	return a.priority < b.priority ? 1 : a.name.localeCompare(b.name);
}

/**
 * Tags can have a -1 priority to be hidden from public, and -2 to be hidden everywhere
 * @param {Array} tags array of tags
 * @param {String} scope public or admin
 * @returns {Array} array of tags without hidden tags and sort
 */
export function sortAndHideTags(tags: any[], scope: Scope = 'public') {
	return tags?.length > 0
		? tags.filter(scope === 'public' ? tag => tag.priority >= 0 : tag => tag.priority >= -1).sort(sortTagByPriority)
		: [];
}

export function getSeriesSingersFull(settings: SettingsStoreData, data: DBKara, i18nParam?: any) {
	return data?.series?.length > 0
		? data.series.map(e => getTagInLocale(settings, e, i18nParam).i18n).join(', ')
		: data?.singergroups?.length > 0
		? data.singergroups.map(e => getTagInLocale(settings, e, i18nParam).i18n).join(', ')
		: data?.singers?.length > 0
		? data.singers.map(e => getTagInLocale(settings, e, i18nParam).i18n).join(', ')
		: ''; // wtf?;
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
	i18nParam?: any
): string | ReactNode {
	const isMulti = data?.langs?.find(e => e.name.indexOf('mul') > -1);
	if (data?.langs && isMulti) {
		data.langs = [isMulti];
	}
	const serieText =
		data.from_display_type && data[data.from_display_type]
			? data[data.from_display_type]
					.slice(0, 3)
					.map(e => getTagInLocale(settings, e, i18nParam).i18n)
					.join(', ') + (data[data.from_display_type].length > 3 ? '...' : '')
			: data?.series?.length > 0
			? data.series
					.slice(0, 3)
					.map(e => getTagInLocale(settings, e, i18nParam).i18n)
					.join(', ') + (data.series.length > 3 ? '...' : '')
			: data?.singergroups?.length > 0
			? data.singergroups
					.slice(0, 3)
					.map(e => getTagInLocale(settings, e, i18nParam).i18n)
					.join(', ') + (data.singergroups.length > 3 ? '...' : '')
			: data?.singers?.length > 0
			? data.singers
					.slice(0, 3)
					.map(e => getTagInLocale(settings, e, i18nParam).i18n)
					.join(', ') + (data.singers.length > 3 ? '...' : '')
			: ''; // wtf?
	const langsText = data?.langs
		?.map(e => e.name)
		.join(', ')
		.toUpperCase();
	const songtypeText = sortAndHideTags(data?.songtypes)
		.map(e => (e.short ? +e.short : e.name))
		.join(' ');
	const songorderText = data?.songorder > 0 ? ' ' + data.songorder : '';
	if (onlyText) {
		const versions = sortAndHideTags(data?.versions).map(t => `[${getTagInLocale(settings, t, i18nParam).i18n}]`);
		const version = versions?.length > 0 ? ` ${versions.join(' ')}` : '';
		return `${langsText} - ${serieText} - ${songtypeText} ${songorderText} - ${getTitleInLocale(
			settings,
			data.titles,
			data.titles_default_language
		)} ${version}`;
	} else {
		const versions = sortAndHideTags(data?.versions).map(t => (
			<span className="tag inline white" key={t.tid}>
				{getTagInLocale(settings, t, i18nParam).i18n}
			</span>
		));
		return (
			<>
				<span>{langsText}</span>
				<span>&nbsp;-&nbsp;</span>
				<span className="karaTitleSerie">{serieText}</span>
				<span>&nbsp;-&nbsp;</span>
				<span>{`${songtypeText} ${songorderText}`}</span>
				<span>&nbsp;-&nbsp;</span>
				<span className="karaTitleTitle">
					{getTitleInLocale(settings, data.titles, data.titles_default_language)}
				</span>
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
					end: lyricGroup[lyricGroup.length - 1].end,
				});
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
}

export function getPreviewLink(kara: DBKara) {
	if (isRemote() || kara.download_status !== 'DOWNLOADED') {
		return `https://${kara.repository}/previews/${kara.kid}.${kara.mediasize}.25.jpg`;
	} else {
		return `/previews/${kara.kid}.${kara.mediasize}.25.jpg`;
	}
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
		side === 'left'
			? setPlaylistInfoRight(context.globalDispatch, oldIdPlaylist)
			: setPlaylistInfoLeft(context.globalDispatch, oldIdPlaylist);
	}
	side === 'left'
		? setPlaylistInfoLeft(context.globalDispatch, plaid)
		: setPlaylistInfoRight(context.globalDispatch, plaid);
}

export function setOppositePlaylistInfo(side: 'left' | 'right', context: GlobalContextInterface, plaid?: string) {
	const oldIdPlaylist = getOppositePlaylistInfo(side, context)?.plaid;
	if (plaid === getPlaylistInfo(side, context)?.plaid) {
		side === 'left'
			? setPlaylistInfoLeft(context.globalDispatch, oldIdPlaylist)
			: setPlaylistInfoRight(context.globalDispatch, oldIdPlaylist);
	}
	side === 'left'
		? setPlaylistInfoRight(context.globalDispatch, plaid)
		: setPlaylistInfoLeft(context.globalDispatch, plaid);
}

function getInlineTag(e: DBKaraTag, tagType: number, scope: 'admin' | 'public', i18nParam?: any) {
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

export function computeTagsElements(kara: DBKara, scope: Scope, versions = true, i18nParam?: any) {
	// Tags in the header
	const karaTags: ReactNode[] = [];

	if (kara.langs) {
		const isMulti = kara.langs.find(e => e.name.indexOf('mul') > -1);
		isMulti
			? karaTags.push(
					<div key={isMulti.tid} className="tag black">
						{getInlineTag(isMulti, tagTypes.LANGS.type, scope, i18nParam)}
					</div>
			  )
			: karaTags.push(
					...sortAndHideTags(kara.langs, scope).map(tag => {
						return (
							<div key={tag.tid} className="tag black" title={tag.short ? tag.short : tag.name}>
								{getInlineTag(tag, tagTypes.LANGS.type, scope, i18nParam)}
							</div>
						);
					})
			  );
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

	const types = versions
		? ['VERSIONS', 'FAMILIES', 'PLATFORMS', 'GENRES', 'ORIGINS', 'MISC', 'WARNINGS']
		: ['FAMILIES', 'PLATFORMS', 'GENRES', 'ORIGINS', 'MISC', 'WARNINGS'];

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
					<i className={`fas fa-fw fa-${tagData.icon}`} />
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
