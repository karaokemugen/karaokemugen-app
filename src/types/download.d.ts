export type QueueStatus = 'started' | 'stopped' | 'paused' | 'updated'

export interface KaraDownload {
	name: string,
	urls: {
		media: DownloadFile,
		lyrics: DownloadFile,
		kara: DownloadFile,
		serie: DownloadFile[]
	}
	size: number,
	uuid: string
	status?: string
}

export interface KaraDownloadBLC {
	type: number,
	value: any,
	id?: number,
	uniquevalue?: any
}

export interface KaraDownloadRequest {
	seriefiles: string[],
	karafile: string,
	mediafile: string,
	subfile: string,
	name: string,
	size: number
}

interface DownloadFile {
	remote: string,
	local: string
}