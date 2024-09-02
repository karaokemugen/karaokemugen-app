import { TagType, TagTypeNum } from '../../../src/lib/types/tag';
import { QuizAnswers } from '../../../src/types/quiz';

export interface tagType {
	icon: string;
	type: TagTypeNum;
	color: string;
	karajson: TagType;
	language: 'song_name' | 'user';
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
	'SINGERGROUPS',
	'SONGTYPES',
	'SONGWRITERS',
	'VERSIONS',
	'WARNINGS',
	'FRANCHISES',
];

export const tagTypes: Readonly<{ [key: string]: tagType }> = {
	SONGTYPES: {
		icon: 'tasks',
		type: 3,
		color: 'green',
		karajson: 'songtypes',
		language: 'user',
	},
	SERIES: {
		icon: 'tv',
		type: 1,
		color: 'green',
		karajson: 'series',
		language: 'song_name',
	},
	LANGS: {
		icon: 'globe',
		type: 5,
		color: 'black',
		karajson: 'langs',
		language: 'user',
	},
	SINGERS: {
		icon: 'microphone-alt',
		type: 2,
		color: 'orange',
		karajson: 'singers',
		language: 'song_name',
	},
	SINGERGROUPS: {
		icon: 'people-group',
		type: 17,
		color: 'orange',
		karajson: 'singergroups',
		language: 'song_name',
	},
	SONGWRITERS: {
		icon: 'signature',
		type: 8,
		color: 'orange',
		karajson: 'songwriters',
		language: 'song_name',
	},
	FAMILIES: {
		icon: 'photo-video',
		type: 10,
		color: 'blue',
		karajson: 'families',
		language: 'user',
	},
	ORIGINS: {
		icon: 'project-diagram',
		type: 11,
		color: 'blue',
		karajson: 'origins',
		language: 'user',
	},
	GENRES: {
		icon: 'chess',
		type: 12,
		color: 'blue',
		karajson: 'genres',
		language: 'user',
	},
	PLATFORMS: {
		icon: 'laptop',
		type: 13,
		color: 'blue',
		karajson: 'platforms',
		language: 'user',
	},
	CREATORS: {
		icon: 'chalkboard-teacher',
		type: 4,
		color: 'purple',
		karajson: 'creators',
		language: 'song_name',
	},
	AUTHORS: {
		icon: 'user-secret',
		type: 6,
		color: 'purple',
		karajson: 'authors',
		language: 'song_name',
	},
	GROUPS: {
		icon: 'box',
		type: 9,
		color: 'black',
		karajson: 'groups',
		language: 'user',
	},
	MISC: {
		icon: 'tag',
		type: 7,
		color: 'black',
		karajson: 'misc',
		language: 'user',
	},
	VERSIONS: {
		icon: 'gauge-high',
		type: 14,
		color: 'white',
		karajson: 'versions',
		language: 'user',
	},
	WARNINGS: {
		icon: 'exclamation-triangle',
		type: 15,
		color: 'red',
		karajson: 'warnings',
		language: 'user',
	},
	COLLECTIONS: {
		icon: 'layer-group',
		type: 16,
		color: 'white',
		karajson: 'collections',
		language: 'user',
	},
	FRANCHISES: {
		icon: 'sitemap',
		type: 18,
		color: 'green',
		karajson: 'franchises',
		language: 'song_name',
	},
};

Object.freeze(tagTypes);

export const YEARS = {
	icon: 'calendar-alt',
	type: 0,
};

export const FAVORITES = {
	icon: 'star',
	type: 1001,
};

export const ANIMELISTS = {
	icon: 'star',
	type: 1002,
};

export const TITLE = {
	icon: 'music',
	type: 1003,
};

export function getTagTypeName(type: TagTypeNum): string {
	return Object.keys(tagTypes).find(t => tagTypes[t].type === type);
}

export function acceptedAnswerToIcon(type: QuizAnswers) {
	switch (type) {
		case 'year':
			return YEARS.icon;
		case 'title':
			return TITLE.icon;
		default:
			return tagTypes[type.toUpperCase()].icon;
	}
}
