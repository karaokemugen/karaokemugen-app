export interface Settings {
	baseChecksum?: string;
	lastGeneration?: number;
}

export interface Query {
	sql: string;
	params?: any[][];
}

export interface LangClause {
	main: string;
	fallback: string;
}

export interface WhereClause {
	sql: string[];
	params: Record<string, unknown>;
}

export interface PGVersion {
	data: number;
	bin: number;
}
