import { StatusResult } from 'simple-git';
import { LogResult } from 'simple-git/typings/response';

export type DiffType = 'equal' | 'modify' | 'add' | 'delete'

export interface DiffResult {
	type: DiffType
	path: string,
	content?: string
}

export interface GitOptions {
	url: string,
	branch: string,
	repo: string,
	dir: string
}

// For KMFrontend
export type GitStatusResult = StatusResult;
export type GitLogResult = LogResult;
