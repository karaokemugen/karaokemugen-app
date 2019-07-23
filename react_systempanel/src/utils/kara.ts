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
