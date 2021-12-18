import { Config } from './config';
import { DBStatsPlayed, DBStatsRequested } from './database/stats';

export interface StatsPayload {
	payloadVersion: number;
	instance: Instance;
	viewcounts: DBStatsPlayed[];
	requests: DBStatsRequested[];
	favorites: Favorite[];
}

interface Instance {
	config: Config;
	instance_id: string;
	version: number;
	locale: string;
	screens: number;
	cpu_manufacturer: string;
	cpu_model: string;
	cpu_speed: string;
	cpu_cores: number;
	memory: number;
	total_disk_space: number;
	os_platform: string;
	os_distro: string;
	os_release: string;
}

interface Favorite {
	kid: string;
}
