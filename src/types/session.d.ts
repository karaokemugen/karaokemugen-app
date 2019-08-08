export interface Session {
	seid: string,
	name: string,
	started_at: Date,
	active?: boolean
}