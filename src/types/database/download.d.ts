import { DownloadFile } from "../download";

export interface DBDownload {
	name: string,
	urls: {
		media: DownloadFile,
		lyrics: DownloadFile,
		kara: DownloadFile,
		serie: DownloadFile[]
	},
	size: number,
	status: string,
	started_at: Date,
	uuid: string
}

export interface DBDownloadBLC {
	dlblc_id: number,
	type: number,
	value: string,
	uniquevalue: string
}

