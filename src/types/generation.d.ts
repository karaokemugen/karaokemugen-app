import {Series} from './series';

export type SeriesMap = Map<string, string[]>

export type TagsByKara = Map<number, Set<Number>>

export interface SeriesInsertData {
	data: Series[],
	map: any
}

export interface TagsInsertData {
	tagsByKara: any,
	allTags: string[]
}

