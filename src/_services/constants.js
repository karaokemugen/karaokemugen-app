/*
 * Constants for KM (tags, langs, types, etc.).
 */

/** Regexps for validation. */
export const uuidRegexp = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
export const mediaFileRegexp = '^.+\\.(avi|mkv|mp4|webm|mov|wmv|mpg|ogg|m4a|mp3)$';
export const imageFileRegexp = '^.+\\.(jpg|jpeg|png|gif)$';
export const subFileRegexp = '^.+\\.ass$';

export const defaultGuestNames = [
	'Jean-Michel Normal',
	'Sakura du 93',
	'Dark Kirito 64',
	'Alex Teriyaki',
	'Le Granblue avec une chaussure noire',
	'MC-kun',
	'Beauf-kun',
	'La Castafiore',
	'xXNarutoSasukeXx',
	'Lionel Shaoran',
	'Pico',
	'Coco',
	'Chico',
	'Dark Flame Master',
	'MAGI System',
	'MAMMUTH!',
	'NinaDeFMA',
	'Hokuto de Cuisine',
	'S€phir0th69',
	'Brigade SOS',
	'THE GAME',
	'Haruhi Suzumiya',
	'Char Aznable',
	'Kira "Jesus" Yamato',
	'Mahoro',
	'Fanboy des CLAMP',
	'Laughing Man',
	'Anime was a mistake',
	'La Police des Doujins',
	'Norio Wakamoto',
	'Nanami Ando',
	'Ayako Suzumiya',
	'I love Emilia',
	'Keikaku-kun',
	'Random imouto',
	'Onii-chan',
	'Pedobear',
	'Le Respect',
	'Idolmaster > Love Live',
	'Love Live > Idolmaster',
	'Les yeux noisette d\'Asuna',
	'Lelouch',
	'Phantom Thieves',
	'Random Isekai MC',
	'Houonin Kyouma',
	'Miyazaki (retired)',
	'Blue Accordéon',
	'Yellow Baguette',
	'Pink A La Mode',
	'Red Fromage',
	'Black Beaujolais',
	'Silver Mousquetaire',
	'Kyonko',
	'My karaoke can\'t be this cute',
	'No bully please',
	'Le type avec un t-shirt blanc là-bas',
	'David Goodenough',
	'Kiss-Shot Acerola-Orion Heart-Under-Blade',
	'BATMAN',
	'Great Mighty Poo',
	'Une simple rêveuse',
	'Kamel Deux Bâches',
	'Segata Sanshiro',
	'Une maman avec une tresse sur l\'épaule',
	'El Psy Kongroo',
	'KuriGohan and Kamehameha',
	'Gihren Zabi did nothing wrong',
	'Tentacle-chan',
	'Dike Spies',
	'Sheryl > Ranka',
	'Ranka > Sheryl',
	'Urakawa Minori',
	'Tomino "Big Bald Man" Yoshiyuki',
	'Your waifu is shiiiiiiiiiit',
	'My Waifu > Your Waifu',
	'Hideaki Anno\'s depression',
	'Mon Voisin Rototo',
	'Kaaaaaneeeeedaaaaaaa',
	'Teeeeetsuuuuoooooooooo'
];

export const initializationCatchphrases = [
	'"Karaoke Mugen is combat-ready!" --Nanami-chan',
	'"Karaoke Mugen, ikouzo!" --Nanami-chan',
	'"Smile! Sweet! Sister! Sadistic! Surprise! SING!" --The Karaoke Mugen Dev Team',
	'"Let us achieve world domination through karaoke!" --Axel Terizaki',
	'"Listen to my song!" --Every Macross Idol',
	'"DATABASE DATABASE WOW WOW" --MAN WITH A MISSION',
	'"Shinji, get in the f*cking karaoke room!" --Gendo Ikari',
	'"Everything is going according to the purerisuto. (Translator note : purerisuto means playlist)" --Bad Fansubs 101',
	'"Are people silent when they stop singing?" --Shirou',
	'"I am the handle of my mic. Rhythm is my body and lyrics are my blood. I have created over a thousand karaokes. Unknown to Silence, Nor known to Noise. Have withstood pain to create many Times. Yet, those hands will never hold anything. So as I sing, Unlimited Karaoke Works." --Archer',
	'"Take this microphone, mongrel, and let me judge if your voice is worth of joining that treasure of mine!" --Gilgamesh',
	'"You are already singing." --Kenshiro',
	'"Karaoke is not beautiful, and that is why it is beautiful." --Kino',
	'"Hey, want to become a karaoke maker?" --／人◕ ‿‿ ◕人＼',
	'"IT\'S JJ STYLE! --King J.J."',
	'"A microphone has no strength, unless the hand that holds it has courage --Link"',
	'"EXPLOSION!" --Megumin',
	'"I\'M A THE GREAT MAD SINGER, HOUHOUIN KYOMA !" --Okabe Rintaro',
	'"If you are not singing with you, sing with me who sings with you" --Kamina',
	'"Do you remember the number of songs you have sung in your life?" --Dio Brando',
	'"Let\'s make a strawberry parfait from this karaoke!" --Hoshimiya Ichigo'
];

export const karaTypes = Object.freeze({
	OP: {type: 'OP', dbType: 'TYPE_OP'},
	ED: {type: 'ED', dbType: 'TYPE_ED'},
	IN: {type: 'IN', dbType: 'TYPE_IN'},
	MV: {type: 'MV', dbType: 'TYPE_MV'},
	PV: {type: 'PV', dbType: 'TYPE_PV'},
	CM: {type: 'CM', dbType: 'TYPE_CM'},
	OT: {type: 'OT', dbType: 'TYPE_OT'},
	AMV: {type: 'AMV', dbType: 'TYPE_AMV'},
	LIVE: {type: 'LIVE', dbType: 'TYPE_LIVE'}
});

export const karaTypesArray = Object.freeze(Object.keys(karaTypes));

export const tagTypes = Object.freeze({
	singer: 2,
	songtype: 3,
	creator: 4,
	lang: 5,
	author: 6,
	misc: 7,
	songwriter: 8
});

/** Map used for database generation */
export const karaTypesMap = Object.freeze(new Map([
	[karaTypes.OP.type, 'TYPE_OP,3'],
	[karaTypes.ED.type, 'TYPE_ED,3'],
	[karaTypes.IN.type, 'TYPE_IN,3'],
	[karaTypes.MV.type, 'TYPE_MV,3'],
	[karaTypes.PV.type, 'TYPE_PV,3'],
	[karaTypes.CM.type, 'TYPE_CM,3'],
	[karaTypes.OT.type, 'TYPE_OT,3'],
	[karaTypes.AMV.type, 'TYPE_AMV,3'],
	[karaTypes.LIVE.type, 'TYPE_LIVE,3'],
]));

/** Extracting type from a string */
export function getType(types) {
	return types.split(/\s+/).find(t => karaTypesArray.includes(t));
}

// Map of the current language naming for Karaoke Mugen's Database.
// At some point, we're going to rename these all to fit ISO639-2B codes.
export const specialLangMap = Object.freeze({
	eng: 'ANG',
	fre: 'FR',
	ger: 'ALL',
	jpn: 'JAP',
	kor: 'COR',
	swe: 'SUE',
	und: 'FIC',
	chi: 'CHI',
	epo: 'EPO',
	fin: 'FIN',
	gle: 'GLE',
	heb: 'HEB',
	ita: 'ITA',
	lat: 'LAT',
	por: 'POR',
	rus: 'RUS',
	spa: 'ESP',
	tel: 'TEL'
});

export const specialTags = Object.freeze({
	GAME: 'GAME',
	GC: 'GC',
	MOVIE: 'MOVIE',
	OAV: 'OAV',
	PS3: 'PS3',
	PS2: 'PS2',
	PSV: 'PSV',
	PSX: 'PSX',
	R18: 'R18',
	REMIX: 'REMIX',
	SPECIAL: 'SPECIAL',
	VOCA: 'VOCA',
	XBOX360: 'XBOX360',
});

export const tags = [
	'SPECIAL',
	'REMIX',
	'VOICELESS',
	'CONCERT',
	'PARODY',
	'HUMOR',
	'R18',
	'SPOIL',
	'LONG',
	'HARDMODE',
	'DUO',
	'REAL',
	'ANIME',
	'MOVIE',
	'TVSHOW',
	'OVA',
	'ONA',
	'VIDEOGAME',
	'VN',
	'MOBAGE',
	'VOCALOID',
	'TOKU',
	'MECHA',
	'MAGICALGIRL',
	'SHOUJO',
	'SHOUNEN',
	'YURI',
	'YAOI',
	'PSX',
	'PS2',
	'PS3',
	'PS4',
	'PSV',
	'PSP',
	'XBOX360',
	'GAMECUBE',
	'DS',
	'3DS',
	'PC',
	'SEGACD',
	'SATURN',
	'WII'
];

export const specialTagsArray = Object.freeze(Object.keys(specialTags));

export const specialTagsMap = Object.freeze(new Map([
	[specialTags.GAME, 'TAG_VIDEOGAME,7'],
	[specialTags.GC, 'TAG_GAMECUBE,7'],
	[specialTags.MOVIE, 'TAG_MOVIE,7'],
	[specialTags.OAV, 'TAG_OVA,7'],
	[specialTags.PS3, 'TAG_PS3,7'],
	[specialTags.PS2, 'TAG_PS2,7'],
	[specialTags.PSV, 'TAG_PSV,7'],
	[specialTags.PSX, 'TAG_PSX,7'],
	[specialTags.R18, 'TAG_R18,7'],
	[specialTags.REMIX, 'TAG_REMIX,7'],
	[specialTags.SPECIAL, 'TAG_SPECIAL,7'],
	[specialTags.VOCA, 'TAG_VOCALOID,7'],
	[specialTags.XBOX360, 'TAG_XBOX360,7']
]));

export function getSpecialTags(tags) {
	return tags.split(/\s+/).filter(t => specialTagsArray.includes(t));
}