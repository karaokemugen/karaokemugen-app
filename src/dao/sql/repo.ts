export const selectRepos = `
SELECT
	pk_repo_name AS name,
	last_downloaded_at
FROM repo
`;