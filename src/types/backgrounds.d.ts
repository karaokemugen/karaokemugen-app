import { backgroundTypes } from '../services/backgrounds.js';

export type BackgroundType = (typeof backgroundTypes)[number];

export interface BackgroundList {
	pictures: string[];
	music: string[];
}
