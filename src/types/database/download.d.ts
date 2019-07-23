import { DownloadFile, KaraDownload } from "../download";

export interface DBDownload extends KaraDownload {
	started_at: Date
}

export interface DBDownloadBLC {
	dlblc_id: number,
	type: number,
	value: string,
	uniquevalue: string
}

