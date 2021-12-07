export type QueueStatus = 'started' | 'stopped' | 'paused' | 'updated';

export interface KaraDownload {
	name: string;
	mediafile: string;
	size: number;
	uuid: string;
	status?: 'DL_RUNNING' | 'DL_PLANNED' | 'DL_DONE' | 'DL_FAILED';
	repository: string;
	kid: string;
}

export interface KaraDownloadRequest {
	mediafile: string;
	name: string;
	size: number;
	repository: string;
	kid: string;
}

interface DownloadFile {
	remote: string;
	local: string;
}

export interface File {
	basename: string;
	size: number;
	kid?: string;
}
