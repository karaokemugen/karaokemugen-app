export interface DownloadItem {
	url: string,
	filename: string,
	size?: number,
	id?: string,
}

export interface DownloadOpts {
	bar: boolean
	auth?: {
		user: string,
		pass: string
	}
}