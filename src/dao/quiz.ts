import { db, paramWords } from '../lib/dao/database.js';
import { tagTypes } from '../lib/utils/constants.js';
import { profile } from '../lib/utils/logger.js';
import { QuizGameConfig } from '../types/config.js';
import { Game, GamePossibleAnswer, GameScore, GameState, GameTotalScore, QuizAnswers } from '../types/quiz.js';
import * as sql from './sql/quiz.js';

export async function insertGame(game: Game) {
	await db().query(sql.insertGame, [game.gamename, game.settings, game.state, game.date]);
}

export async function updateGame(gamename: string, settings: QuizGameConfig, state: GameState, flag_active = true) {
	await db().query(sql.updateGame, [gamename, settings, state, flag_active]);
}

export async function dropGame(gamename: string) {
	await db().query(sql.deleteGame, [gamename]);
}

export async function insertScore(score: GameScore) {
	await db().query(sql.insertScore, [
		score.login,
		score.answer,
		score.points,
		score.points_detailed,
		score.kid,
		score.gamename,
	]);
}

export async function selectGames(): Promise<Game[]> {
	const res = await db().query(sql.selectGames);
	return res.rows;
}

export async function selectScores(gamename: string, login?: string): Promise<GameScore[]> {
	const params = [gamename];
	if (login) params.push(login);
	const res = await db().query(sql.selectScores(login), params);
	return res.rows;
}

export async function selectTotalScores(gamename: string): Promise<GameTotalScore[]> {
	const res = await db().query(sql.selectTotalScores, [gamename]);
	return res.rows;
}

export async function truncateScores(gamename: string) {
	await db().query(sql.truncateScores, [gamename]);
}

export async function selectPossibleAnswers(words: string): Promise<GamePossibleAnswer[]> {
	const res = await db().query(sql.selectPossibleAnswers, [paramWords(words).join(' & ')]);
	return res.rows;
}

export async function fillPossibleAnswers(answers: QuizAnswers[]) {
	profile('fillPossibleAnswers');
	await db().query(sql.truncateTempTable);
	const promises = [];
	for (const answer of answers) {
		promises.push(db().query(sql.fillTempTable(answer, tagTypes[answer])));
	}
	await Promise.all(promises);
	db().query('VACUUM ANALYZE game_possible_answers');
	profile('fillPossibleAnswers');
}
