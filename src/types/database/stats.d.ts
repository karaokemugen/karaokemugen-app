interface DBStatsBase {
	kid: string,
	seid: string,
}

export interface DBStatsPlayed extends DBStatsBase {
	played_at: Date
}

export interface DBStatsRequested extends DBStatsBase {
	requested_at: Date
}
