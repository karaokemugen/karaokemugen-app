import { Config } from './config';

export interface StatsPayload {
	payloadVersion: number,
	instance: Instance,
	viewcounts: Viewcount[],
	requests: SongRequest[],
	favorites: Favorite[],
}

interface Instance {
	config: Config
	instance_id: string,
	version: number,
	locale: string,
	screens: number,
	cpu_manufacturer: string,
	cpu_model: string,
	cpu_speed: string,
	cpu_cores: number,
	memory: number,
	total_disk_space: number,
	os_platform: string,
	os_distro: string,
	os_release: string
}

interface Viewcount {
	kid: string,
	session_started_at: Date,
	played_at: Date
}

interface SongRequest {
	kid: string,
	session_started_at: Date,
	requested_at: Date
}

interface Favorite {
	kid: string
}