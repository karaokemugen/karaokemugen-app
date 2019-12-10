import { getNavigatorLanguageIn2B } from '../isoLanguages';

const navigatorLanguage:string = getNavigatorLanguageIn2B();

export function getTagInLocale(champ) {
	return champ.i18n[navigatorLanguage] ? champ.i18n[navigatorLanguage] : champ.i18n['eng'];
}

export function getTagInLocaleList(i18n, list) {
	if (list) {
		return list.map(champ => {
			if (i18n[champ.tid] !== undefined) {
				return i18n[champ.tid][navigatorLanguage]
					? i18n[champ.tid][navigatorLanguage]
					: i18n[champ.tid]['eng'];
			} else {
				return champ.name;
			}
		});
	} else {
		return [];
	}
}

export function getNameTagInLocaleList(list) {
	if (list) {
		return list.map(champ => {
			return getTagInLocale(champ);
		});
	} else {
		return [];
	}
}


/**
* Build kara title for users depending on the data
* @param {Object} data - data from the kara
* @return {String} the title
*/
export function buildKaraTitle(data) {
	var isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
	if (data.langs && isMulti) {
		data.langs = [isMulti];
	}
	var limit = 50;
	var serieText = data.serie ? data.serie : data.singers.map(e => e.name).join(', ');
	serieText = serieText.length <= limit ? serieText : serieText.substring(0, limit) + '…';
	var titleArray = [
		data.langs.map(e => e.name).join(', ').toUpperCase(),
		serieText,
		(data.songtypes[0].short ? + data.songtypes[0].short : data.songtypes[0].name) + (data.songorder > 0 ? ' ' + data.songorder : '')
	];
	var titleClean = titleArray.map(function (e, k) {
		return titleArray[k] ? titleArray[k] : '';
	});

	var separator = '';
	if (data.title) {
		separator = ' - ';
	}
	return titleClean.join(' - ') + separator + data.title;
};