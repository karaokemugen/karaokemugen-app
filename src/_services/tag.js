import {getConfig} from '../_common/utils/config';
import langs from 'langs';
import {resolve} from 'path';
import {getLanguage} from 'iso-countries-languages';
import {getAllTags} from '../_dao/tag';
import {profile} from '../_common/utils/logger';

export function translateTags(taglist,lang) {
	// If lang is not provided, assume we're using node's system locale
	if (!lang) lang = getConfig().EngineDefaultLocale;
	// Test if lang actually exists in ISO639-1 format
	if (!langs.has('1',lang)) throw `Unknown language : ${lang}`;
	// Instanciate a translation object for our needs with the correct language.
	const i18n = require('i18n'); // Needed for its own translation instance
	i18n.configure({
		directory: resolve(__dirname,'../_common/locales'),
	});
	i18n.setLocale(lang);
	// We need to read the detected locale in ISO639-1
	const detectedLocale = langs.where('1',lang);
	taglist.forEach((tag, index) => {
		if (tag.type >= 2 && tag.type <= 999 && tag.type !== 5) {
			if (tag.name.startsWith('TAG_') || tag.name.startsWith('TYPE_') || tag.name === 'NO_TAG') {
				taglist[index].name_i18n = i18n.__(tag.name);
			} else {
				taglist[index].name_i18n = tag.name;
			}
		}
		// Special case for languages
		if (tag.type === 5) {
			if (tag.name === 'und') {
				taglist[index].name_i18n = i18n.__('UNDEFINED_LANGUAGE');
			} else if (tag.name === 'zxx') {
				taglist[index].name_i18n = i18n.__('NO_LANGUAGE');
			} else {
				// We need to convert ISO639-2B to ISO639-1 to get its language
				const langdata = langs.where('2B', tag.name);
				if (langdata === undefined) {
					taglist[index].name_i18n = i18n.__('UNKNOWN_LANGUAGE');
				} else {
					taglist[index].name_i18n = (getLanguage(detectedLocale[1],langdata[1]));
				}
			}
		}
	});
	return taglist;
}

function filterTags(tags, filter, type) {
	if (type) tags = tags.filter(tag => +tag.type === +type);
	if (filter) tags = tags.filter(tag => tag.name.toUpperCase().includes(filter.toUpperCase()) || tag.name_i18n.toUpperCase().includes(filter.toUpperCase()));
	return tags;
}

export async function formatTagList(tagList, lang, from, count) {
	tagList = await translateTags(tagList, lang);
	return {
		infos: {
			count: count,
			from: from,
			to: from + tagList.length
		},
		content: tagList
	};
}

export async function getTags(lang, filter, type, from, size) {
	profile('getTags');
	let tags = await getAllTags();
	tags = await translateTags(tags, lang);
	tags = filterTags(tags, filter, type);
	const ret = await formatTagList(tags.slice(from, from + size), lang, from, tags.length);
	profile('getTags');
	return ret;
}
