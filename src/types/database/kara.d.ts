export interface DBKaraHistory {
	title: string,
	songorder: number,
	serie: string,
	singers: DBKaraTag[],
	songtypes: DBKaraTag[],
	languages: DBKaraTag[],
	played: number,
	played_at: Date
}

export interface DBYear {
	year: number,
	karacount: number
}

export interface DBKaraTag {
	i18n: any,
	name: string,
	slug: string,
	tagtype: number,
	pk_id_tag: number
}

export interface DBKaraBase {
	kid: string,
	title: string,
	sid: string[],
	subfile: string,
	mediafile: string,
	karafile: string,
	duration: number,
}

export interface DBKaraExtended extends DBKaraBase {
	songorder: number,
	serie: string,
	serie_orig: string,
	serie_altname: string[][],
	singers: DBKaraTag[],
	songtype: DBKaraTag[],
	creators: DBKaraTag[],
	songwriters: DBKaraTag[],
	year: number
	languages: DBKaraTag[],
	authors: DBKaraTag[],
	misc_tags: DBKaraTag[],
	created_at: Date,
	modified_at: Date
}

export interface DBKara extends DBKaraExtended {
	seriefiles: string[],
	gain: number,
	mediasize: number,
	groups: DBKaraTag[],
	played: number,
	requested: number,
	flag_dejavu: boolean,
	lastplayed_at: Date,
	lastplayed_ago: string,
	flag_favorites: boolean,
	repo: string,
	previewfile?: string
}