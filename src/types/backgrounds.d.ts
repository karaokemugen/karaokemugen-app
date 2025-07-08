import { backgroundTypes } from '../services/backgrounds.js';

export type BackgroundType = (typeof backgroundTypes)[number];

export interface BackgroundList {
	pictures: string[];
	music: string[];
}

export interface BackgroundRequest<T> {
	type: BackgroundType;
	file: T;
}

export interface BackgroundListRequest {
	type: BackgroundType;
}
