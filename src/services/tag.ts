import langs from 'langs';
import {join} from 'path';
import {getSupportedLangs, getLanguage} from 'iso-countries-languages';
import {getAllTags} from '../dao/tag';
import {profile} from '../utils/logger';
import { TagParams } from '../types/tag';
import { DBTag } from '../types/database/tag';

export function translateTags(taglist: DBTag[]) {
	const translations = require(join(__dirname,'../locales/'));
	// We need to read the detected locale in ISO639-1
	taglist.forEach((tag, index) => {
		let i18nString: string;
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

export async function formatTagList(tagList: DBTag[], from: number, count: number) {
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

export async function getTags(params: TagParams) {
	profile('getTags');
	const tags = await getAllTags(params);
	const ret = await formatTagList(tags.slice(params.from, params.from + params.size), params.from, tags.length);
	profile('getTags');
	return ret;
}
