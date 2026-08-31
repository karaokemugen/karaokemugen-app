import { RemoteFailure, RemoteSuccess } from '../lib/types/remote.js';

interface RemoteStatusInactive {
	active: false;
}

interface RemoteStatusActive {
	active: true;
	info: RemoteSuccess | RemoteFailure;
	token: string;
}

export type RemoteStatusData = RemoteStatusInactive | RemoteStatusActive;
