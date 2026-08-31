import { playerBackgroundTypes } from "../utils/constants.js";

export type BackgroundType = (typeof playerBackgroundTypes)[number];

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
