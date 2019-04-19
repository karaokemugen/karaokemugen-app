import {KaraParams} from './kara';

export interface TagParams extends KaraParams {
	type: number
}

export interface Tag {
	tag: string,
	type: number,
	id?: number
}