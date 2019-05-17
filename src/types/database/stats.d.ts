interface DBStatsBase {
	kid: string,
	session_started_at: Date,
}

export interface DBStatsPlayed extends DBStatsBase {
	played_at: Date
}

export interface DBStatsRequested extends DBStatsBase {
	requested_at: Date
}

export interface DBStatsFavorites {
	kid: string
}
