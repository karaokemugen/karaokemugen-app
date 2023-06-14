import { QuizAnswers } from '../../types/quiz.js';

export const insertGame = `
INSERT INTO game(pk_gamename, settings, state, date, flag_active) VALUES($1, $2, $3, $4, true)
`;

export const insertScore = `
INSERT INTO game_scores(fk_login, answer, points, points_detailed, fk_kid, fk_gamename) VALUES($1, $2, $3, $4, $5, $6)
ON CONFLICT (fk_login, fk_kid, fk_gamename) DO UPDATE SET
	fk_login = $1,
	answer = $2,
	points = $3,
	points_detailed = $4,
	fk_kid = $5,
	fk_gamename = $6
`;

export const deleteGame = `
DELETE FROM game
WHERE pk_gamename = $1;
`;

export const updateGame = `
UPDATE game SET
	settings = $2,
	state = $3,
	flag_active = $4,
	date = NOW()
WHERE pk_gamename = $1
`;

export const selectGames = `
SELECT 
	pk_gamename AS gamename,
	settings,
	state,
	date,
	flag_active
FROM game
`;

export const selectScores = (user: string) => `
SELECT 
	fk_login AS login,
	answer,
	points,
	points_detailed,
	fk_kid AS kid,
	fk_gamename AS gamename
FROM game_scores
WHERE fk_gamename = $1
${user ? ' AND fk_login = $2' : ''}
`;

export const selectTotalScores = `
SELECT fk_login AS login,
     SUM(points)::integer AS total
FROM game_scores
WHERE fk_gamename = $1
GROUP BY fk_login
ORDER BY total DESC
`;

export const truncateScores = `
DELETE FROM game_scores
WHERE fk_gamename = $1;
`;

export const fillTempTable = (type: QuizAnswers, tagType?: number) => `
INSERT INTO game_possible_answers 
${
	type === 'year'
		? "SELECT DISTINCT year, NULL::jsonb, NULL, NULL::integer, to_tsvector('public.unaccent_conf', year::text), NULL::uuid FROM kara"
		: ''
}
${
	type === 'title'
		? 'SELECT titles->>titles_default_language, titles, titles_default_language, NULL, title_search_vector, pk_kid FROM kara'
		: ''
}
${
	type !== 'title' && type !== 'year'
		? `SELECT name, i18n, NULL, ${tagType}, tag_search_vector, pk_tid FROM tag WHERE types @> ARRAY[${tagType}]`
		: ''
}
`;

export const truncateTempTable = `
TRUNCATE game_possible_answers
`;

export const selectPossibleAnswers = `
SELECT fk_ktid AS ktid, default_name, i18n, default_language, type
FROM game_possible_answers, to_tsquery('public.unaccent_conf', $1) as query
WHERE search_vector @@ query ORDER BY ts_rank_cd(search_vector, query, 4) DESC
LIMIT 100
`;
