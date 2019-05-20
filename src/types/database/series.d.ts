export interface DBSeriesBase {
	name: string,
	sid: string
}

export interface DBSeries extends DBSeriesBase {
	i18n_name: string,
	aliases: string[],
	i18n: DBSeriesLang[],
	search: string,
	seriefile: string,
	karacount: number
}

interface DBSeriesLang {
	lang: string,
	name: string
}