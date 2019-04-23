import {Series} from './series';

export type SeriesMap = Map<string, SeriesMapData>

export type TagsByKara = Map<number, Set<Number>>

interface SeriesMapData {
	sid: string,
	kids: string[]
}

export interface SeriesInsertData {
	data: Series[],
	map: any
}

export interface TagsInsertData {
	tagsByKara: any,
	allTags: string[]
}

