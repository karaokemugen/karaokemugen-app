export interface BinariesConfig {
	ffmpeg: string,
	mpv: string,
	postgres: string,
	patch: string,
	postgres_ctl: string,
	postgres_dump: string,
	postgres_client: string,
	git?: string // Will be used in later releases
}
