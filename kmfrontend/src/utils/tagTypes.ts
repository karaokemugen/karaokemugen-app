import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
	faBox,
	faCalendarAlt,
	faChalkboardTeacher,
	faChess,
	faExclamationTriangle,
	faGaugeHigh,
	faGlobe,
	faLaptop,
	faLayerGroup,
	faMicrophoneAlt,
	faMusic,
	faPeopleGroup,
	faPhotoVideo,
	faProjectDiagram,
	faSignature,
	faSitemap,
	faStar,
	faTag,
	faTasks,
	faTv,
	faUserSecret,
} from '@fortawesome/free-solid-svg-icons';
import { TagType, TagTypeNum } from '../../../src/lib/types/tag';
import { QuizAnswers } from '../../../src/types/quiz';

export interface tagType {
	icon: IconDefinition;
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
		icon: faTasks,
		type: 3,
		color: 'green',
		karajson: 'songtypes',
		language: 'user',
	},
	SERIES: {
		icon: faTv,
		type: 1,
		color: 'green',
		karajson: 'series',
		language: 'song_name',
	},
	LANGS: {
		icon: faGlobe,
		type: 5,
		color: 'black',
		karajson: 'langs',
		language: 'user',
	},
	SINGERS: {
		icon: faMicrophoneAlt,
		type: 2,
		color: 'orange',
		karajson: 'singers',
		language: 'song_name',
	},
	SINGERGROUPS: {
		icon: faPeopleGroup,
		type: 17,
		color: 'orange',
		karajson: 'singergroups',
		language: 'song_name',
	},
	SONGWRITERS: {
		icon: faSignature,
		type: 8,
		color: 'orange',
		karajson: 'songwriters',
		language: 'song_name',
	},
	FAMILIES: {
		icon: faPhotoVideo,
		type: 10,
		color: 'blue',
		karajson: 'families',
		language: 'user',
	},
	ORIGINS: {
		icon: faProjectDiagram,
		type: 11,
		color: 'blue',
		karajson: 'origins',
		language: 'user',
	},
	GENRES: {
		icon: faChess,
		type: 12,
		color: 'blue',
		karajson: 'genres',
		language: 'user',
	},
	PLATFORMS: {
		icon: faLaptop,
		type: 13,
		color: 'blue',
		karajson: 'platforms',
		language: 'user',
	},
	CREATORS: {
		icon: faChalkboardTeacher,
		type: 4,
		color: 'purple',
		karajson: 'creators',
		language: 'song_name',
	},
	AUTHORS: {
		icon: faUserSecret,
		type: 6,
		color: 'purple',
		karajson: 'authors',
		language: 'song_name',
	},
	GROUPS: {
		icon: faBox,
		type: 9,
		color: 'black',
		karajson: 'groups',
		language: 'user',
	},
	MISC: {
		icon: faTag,
		type: 7,
		color: 'black',
		karajson: 'misc',
		language: 'user',
	},
	VERSIONS: {
		icon: faGaugeHigh,
		type: 14,
		color: 'white',
		karajson: 'versions',
		language: 'user',
	},
	WARNINGS: {
		icon: faExclamationTriangle,
		type: 15,
		color: 'red',
		karajson: 'warnings',
		language: 'user',
	},
	COLLECTIONS: {
		icon: faLayerGroup,
		type: 16,
		color: 'white',
		karajson: 'collections',
		language: 'user',
	},
	FRANCHISES: {
		icon: faSitemap,
		type: 18,
		color: 'green',
		karajson: 'franchises',
		language: 'song_name',
	},
};

Object.freeze(tagTypes);

export const YEARS = {
	icon: faCalendarAlt,
	type: 0,
};

export const FAVORITES = {
	icon: faStar,
	type: 1001,
};

export const ANIMELISTS = {
	icon: faStar,
	type: 1002,
};

export const TITLE = {
	icon: faMusic,
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
