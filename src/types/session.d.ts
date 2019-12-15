export interface Session {
	seid: string,
	name: string,
	started_at: Date,
	played?: number,
	requested?: number,
	active?: boolean,
	private?: boolean
}