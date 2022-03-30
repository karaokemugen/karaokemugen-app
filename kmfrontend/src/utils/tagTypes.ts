export interface tagType {
	icon: string;
	type: number;
	color: string;
	karajson: string;
}

export const tagTypesKaraFileV4Order = [
	'AUTHORS',
	'COLLECTIONS',
	'CREATORS',
	'FAMILIES',
	'GENRES',
	'GROUPS',
	'LANGS',
	'MISC',
	'ORIGINS',
	'PLATFORMS',
	'SERIES',
	'SINGERS',
	'SONGTYPES',
	'SONGWRITERS',
	'VERSIONS',
	'WARNINGS',
];

export const tagTypes: Readonly<{ [key: string]: tagType }> = {
	SONGTYPES: {
		icon: 'tasks',
		type: 3,
		color: 'green',
		karajson: 'songtypes',
	},
	SERIES: {
		icon: 'tv',
		type: 1,
		color: 'green',
		karajson: 'series',
	},
	LANGS: {
		icon: 'globe',
		type: 5,
		color: 'green',
		karajson: 'langs',
	},
	SINGERS: {
		icon: 'microphone-alt',
		type: 2,
		color: 'orange',
		karajson: 'singers',
	},
	SONGWRITERS: {
		icon: 'signature',
		type: 8,
		color: 'orange',
		karajson: 'songwriters',
	},
	FAMILIES: {
		icon: 'photo-video',
		type: 10,
		color: 'blue',
		karajson: 'families',
	},
	ORIGINS: {
		icon: 'project-diagram',
		type: 11,
		color: 'blue',
		karajson: 'origins',
	},
	GENRES: {
		icon: 'chess',
		type: 12,
		color: 'blue',
		karajson: 'genres',
	},
	PLATFORMS: {
		icon: 'laptop',
		type: 13,
		color: 'blue',
		karajson: 'platforms',
	},
	CREATORS: {
		icon: 'chalkboard-teacher',
		type: 4,
		color: 'purple',
		karajson: 'creators',
	},
	AUTHORS: {
		icon: 'user-secret',
		type: 6,
		color: 'purple',
		karajson: 'authors',
	},
	GROUPS: {
		icon: 'box',
		type: 9,
		color: 'black',
		karajson: 'groups',
	},
	MISC: {
		icon: 'tag',
		type: 7,
		color: 'black',
		karajson: 'misc',
	},
	VERSIONS: {
		icon: 'gauge-high',
		type: 14,
		color: 'white',
		karajson: 'versions',
	},
	WARNINGS: {
		icon: 'exclamation-triangle',
		type: 15,
		color: 'red',
		karajson: 'warnings',
	},
	COLLECTIONS: {
		icon: 'layer-group',
		type: 16,
		color: 'white',
		karajson: 'collections',
	},
};

Object.freeze(tagTypes);

export const YEARS = {
	icon: 'calendar-alt',
	type: 0,
};

export function getTagTypeName(type: number): string {
	return Object.keys(tagTypes).find(t => tagTypes[t].type === type);
}
