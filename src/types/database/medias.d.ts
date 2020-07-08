import { MediaType } from '../medias';

export interface DBMedia {
	filename: string,
	type: MediaType,
	size: number,
	audiogain: number,
}