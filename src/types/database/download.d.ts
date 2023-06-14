import { KaraDownload } from '../download.js';

export interface DBDownload extends KaraDownload {
	started_at: Date;
}
