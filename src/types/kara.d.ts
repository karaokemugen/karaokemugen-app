import { Token } from "./user";
import { Kara, KaraFileV4 } from '../lib/types/kara'


export interface KaraList {
	infos: {
		count: number,
		from: number,
		to: number
	},
	content: any[]
}

export interface MediaInfo {
	size?: number,
	error: boolean,
	gain: number,
	duration: number
}