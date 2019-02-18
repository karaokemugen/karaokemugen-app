import langs from 'langs';
import {join} from 'path';
import {getSupportedLangs, getLanguage} from 'iso-countries-languages';
import {getAllTags} from '../_dao/tag';
import {profile} from '../_utils/logger';

export function translateTags(taglist) {
	const translations = require(join(__dirname,'../_locales/'));
	// We need to read the detected locale in ISO639-1
	taglist.forEach((tag, index) => {
		let i18nString;
		if (tag.type === 5) {
			const langdata = langs.where('2B', tag.name);
			if (!langdata) i18nString = 'UNKNOWN_LANGUAGE';
			if (tag.name === 'und') i18nString = 'UNDEFINED_LANGUAGE';
			if (tag.name === 'zxx') i18nString = 'NO_LANGUAGE';
			if (i18nString) {
				for (const language of Object.keys(translations)) {
					taglist[index].i18n[language] = translations[language][i18nString];
				}
			} else {
				for (const lang of getSupportedLangs()) {
					taglist[index].i18n[lang] = getLanguage(lang, langdata[1]);
				}
			}
		}
	});
	return taglist;
}

export async function formatTagList(tagList, from, count) {
	tagList = await translateTags(tagList);
	return {
		infos: {
			count: count,
			from: from,
			to: from + tagList.length
		},
		content: tagList
	};
}

export async function getTags(filter, type, from, size) {
	profile('getTags');
	let tags = await getAllTags(filter, type, from, size);
	const ret = await formatTagList(tags.slice(from, from + size), from, tags.length);
	profile('getTags');
	return ret;
}
