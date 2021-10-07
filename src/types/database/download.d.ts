import { KaraDownload } from '../download';

export interface DBDownload extends KaraDownload {
	started_at: Date;
}
