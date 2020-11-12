export interface Session {
	seid: string,
	name: string,
	started_at: Date,
	ended_at: Date,
	played?: number,
	requested?: number,
	active?: boolean,
	private?: boolean
}

export interface SessionExports {
	played: string,
	playedCount: string,
	requested: string,
	requestedCount: string
}