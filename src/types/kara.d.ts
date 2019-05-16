import { Token } from "./user";

export interface KaraParams {
	filter?: string,
	lang?: string,
	from?: number,
	size?: number,
	mode?: string,
	modeValue?: string,
	username?: string,
	admin?: boolean,
	random?: number,
	token?: Token
}

export interface NewKara {
	data: Kara,
	file: string,
	fileData: KaraFileV4
}

export interface Kara {
	kid?: string,
	languages?: KaraLang[],
	languages_i18n?: string[],
	previewfile?: string,
	mediafile?: string,
	mediafile_orig?: string,
	mediasize?: number,
	mediaduration?: number,
	mediagain?: number,
	subfile?: string,
	subfile_orig?: string,
	subchecksum?: string,
	karafile?: string,
	title?: string,
	year?: number,
	order?: any,
	dateadded?: Date,
	datemodif?: Date,
	overwrite?: boolean,
	series?: string[],
	singer?: string[],
	tags?: string[],
	groups?: string[],
	songwriter?: string[],
	creator?: string[],
	author?: string[],
	lang?: string[],
	type?: string,
	error?: boolean,
	isKaraModified?: boolean,
	version?: number,
	repo?: string,
	noNewVideo?: boolean,
	sids?: string[]
}

export interface MediaFile {
	version: string,
	filename: string,
	audiogain: number,
	duration: number,
	filesize: number,
	default: boolean,
	lyrics: LyricsFile[]
}

export interface LyricsFile {
	filename: string,
	default: boolean,
	version: string,
}

export interface KaraFileV4 {
	header: {
		version: number,
		description: string,
	},
	medias: MediaFile[],
	data: {
		title: string,
		sids: string[],
		songtype: string,
		year: number,
		songorder: number,
		singers: string[],
		tags: string[],
		songwriters: string[],
		creators: string[],
		authors: string[],
		repository: string,
		langs: string[],
		groups: string[],
		created_at: string,
		modified_at: string,
		kid: string
	}
}

export interface KaraFileV3 {
	ass?: string,
	karafile?: string,
	error?: boolean,
	isKaraModified?: boolean,
	KID: string,
	mediafile: string,
	mediasize: number,
	mediaduration: number,
	mediagain: number
	subfile: string,
	subchecksum: string,
	title: string,
	year: any,
	order: any,
	dateadded: number,
	datemodif: number,
	series: string,
	singer: string,
	tags: string,
	groups: string,
	songwriter: string,
	creator: string,
	author: string,
	lang: string,
	type: string,
	version: number
}

export interface KaraLang {
	name: string
}

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