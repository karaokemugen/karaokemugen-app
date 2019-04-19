export interface KaraParams {
	filter: string,
	lang: string,
	from?: number,
	size?: number,
	mode?: string,
	modeValue?: string,
	username?: string,
	admin?: boolean,
	random?: number
}

export interface Kara {
	kid?: string,
	languages?: KaraLang[],
	languages_i18n?: string[],
	previewfile?: string,
	mediafile?: string,
	mediasize?: number,
	mediaduration?: number,
	mediagain?: number,
	subfile?: string,
	subchecksum?: string,
	karafile?: string,
	title: string,
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
	version?: number
}

export interface KaraFile {
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
	content: Kara[]
}

export interface MediaInfo {
	size: number,
	error: boolean,
	gain: number,
	duration: number
}