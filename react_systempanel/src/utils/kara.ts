import langs from 'langs';

var navigatorLanguage;

function getNavigatorLanguage() {
	var languages = langs.all();
	var index = 0;
	while (!navigatorLanguage && index < languages.length) {
		if (navigator.languages[0].substring(0, 2) === languages[index]['1']) {
			navigatorLanguage = languages[index]['2B'];
		}
		index++;
	}
	return navigatorLanguage;
}
navigatorLanguage = getNavigatorLanguage();

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