import { RemoteFailure, RemoteSuccess } from "../../../../src/lib/types/remote";

interface RemoteStatusInactive {
	active: false;
}

interface RemoteStatusActive {
	active: true;
	info: RemoteSuccess | RemoteFailure;
	token: string;
}

type RemoteStatusData = RemoteStatusInactive | RemoteStatusActive;
