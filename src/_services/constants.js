/*
 * Référentiel de KM (tags, langs, types, etc.).
 */

/** Expressions régulières de validation. */
export const uuidRegexp = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
export const mediaFileRegexp = '^.+\\.(avi|mkv|mp4|webm|mov|wmv|mpg|ogg|m4a|mp3)$';
export const imageFileRegexp = '^.+\\.(jpg|jpeg|png|gif)$';
export const subFileRegexp = '^.+\\.ass$';

export const defaultGuestNames = [
	'Jean-Michel Normal',
	'Sakura du 93',
	'Dark Kirito 64',
	'Alex Teriyaki',
	'Le Grandblue avec une chaussure noire',
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
	'Lelouch'	
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
	'"Hey, want to become a karaoke maker?" -- ／人◕ ‿‿ ◕人＼'
];

export const karaTypes = Object.freeze({
	OP: 'OP',
	ED: 'ED',
	IN: 'IN',
	MV: 'MV',
	PV: 'PV',
	CM: 'CM',
	OT: 'OT',
	AMV: 'AMV',
	LIVE: 'LIVE'
});

export const karaTypesArray = Object.freeze(Object.keys(karaTypes));

/** Map used for database generation */
export const karaTypesMap = Object.freeze(new Map([
	[karaTypes.OP, 'TYPE_OP,3'],
	[karaTypes.ED, 'TYPE_ED,3'],
	[karaTypes.IN, 'TYPE_INSERTSONG,3'],
	[karaTypes.MV, 'TYPE_MUSIC,3'],
	[karaTypes.PV, 'TYPE_PV,3'],
	[karaTypes.CM, 'TYPE_CM,3'],
	[karaTypes.OT, 'TYPE_OTHER,3'],
	[karaTypes.AMV, 'TYPE_AMV,3'],
	[karaTypes.LIVE, 'TYPE_LIVE,3'],
]));

/** Extracting type from a string */
export function getType(types) {
	return types.split(/\s+/).find(t => karaTypesArray.includes(t));
}

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
	XBOX360: 'XBOX360'
});

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