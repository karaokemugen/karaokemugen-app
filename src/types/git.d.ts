export type DiffType = 'equal' | 'modify' | 'add' | 'delete';

export interface DiffResult {
	type: DiffType;
	path: string;
	content?: string;
}

export interface GitOptions {
	url: string;
	branch: string;
	repo: string;
	dir: string;
}
