export type QueueStatus = 'started' | 'stopped' | 'paused' | 'updated'

export interface KaraDownload {
	name: string,
	urls: {
		media: DownloadFile,
		lyrics: DownloadFile,
		kara: DownloadFile,
		serie: DownloadFile[],
		tag: DownloadFile[]
	}
	size: number,
	uuid: string
	status?: 'DL_RUNNING' | 'DL_PLANNED' | 'DL_DONE' | 'DL_FAILED',
	repository: string
}

export interface KaraDownloadBLC {
	type: number,
	value: any,
	id?: number,
	uniquevalue?: any
}

export interface KaraDownloadRequest {
	seriefiles: string[],
	tagfiles: string[],
	karafile: string,
	mediafile: string,
	subfile: string,
	name: string,
	size: number,
	repository: string
}

interface DownloadFile {
	remote: string,
	local: string
}

export interface File {
	basename: string,
	size: number
}