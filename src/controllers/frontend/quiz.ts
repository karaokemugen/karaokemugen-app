import z from 'zod';
import { WS_CMD } from '../../../kmfrontend/src/utils/ws.mjs';
import { APIMessage } from '../../lib/services/frontend.js';
import { check } from '../../lib/utils/validators.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	continueGameSong,
	deleteGame,
	getGames,
	getGameScore,
	getPlayedKarasInQuiz,
	getPossibleAnswers,
	getTotalGameScore,
	resetGameScores,
	setAnswer,
	startGame,
	stopGame,
} from '../../services/quiz.js';
import { getPublicCurrentGame, getState } from '../../utils/state.js';
import { runChecklist } from '../middlewares.js';
import { blindMode } from '../../utils/constants.js';

export default function quizController(router: SocketIOApp) {
	router.route(WS_CMD.START_GAME, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			check(req.body, z.object({ 
				gamename: z.string(),
				playlist: z.uuidv4(),
				settings: z.object({
					EndGame: z.object({
						MaxScore: z.object({
							Enabled: z.boolean(),
							Score: z.number().int().min(1),
						}).optional(),
						MaxSongs: z.object({
							Enabled: z.boolean(),
							Songs: z.number().int().min(1),
						}).optional(),
						Duration: z.object({
							Enabled: z.boolean(),
							Minutes: z.number().int().min(1),
						}).optional(),
					}),
					Players: z.object({
						Twitch: z.boolean(),
						TwitchPlayerName: z.string().optional(),
						Guests: z.boolean(),
					}),
					TimeSettings: z.object({
						WhenToStartSong: z.number().int().min(0),
						GuessingTime: z.number().int().min(0),
						QuickGuessingTime: z.number().int().min(0),
						AnswerTime: z.number().int().min(0),
					}),
					Answers: z.object({
						Accepted: z.record(z.string(), z.object({
							Enabled: z.boolean(),
  							Points: z.number().int().min(1),
						})),
						QuickAnswer: z.object({
							Enabled: z.boolean(),
							Points: z.number().int().min(1),
						}),
						SimilarityPercentageNeeded: z.number().int().min(0).max(100),
					}),
					Modifiers: z.object({
						Mute: z.boolean().optional(),
						Blind: z.enum(blindMode).optional(),
						NoLyrics: z.boolean().optional(),
						Pitch: z.number().optional(),
						Speed: z.number().optional(),
					}),
					PlayerMessage: z.string().optional(),
				}),
			}));
			await startGame(req.body.gamename, req.body.playlist, req.body.settings);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.STOP_GAME, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			// When stopGame is triggered via API, we don't display scores
			await stopGame(false);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.DELETE_GAME, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			check(req.body, z.object({
				gamename: z.string(),
			}));
			await deleteGame(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.RESET_GAME_SCORES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			check(req.body, z.object({
				gamename: z.string(),
			}));
			await resetGameScores(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.CONTINUE_GAME_SONG, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			return continueGameSong();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_GAMES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			return await getGames();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_GAME_SCORE, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				gamename: z.string(),
			}));
			return await getGameScore(req.body.gamename, req.token.username);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_TOTAL_GAME_SCORE, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				gamename: z.string(),
			}));
			return await getTotalGameScore(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_POSSIBLE_ANSWERS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			check(req.body, z.object({
				answer: z.string(),
			}));
			return await getPossibleAnswers(req.body.answer);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.SET_ANSWER, async (socket, req) => {
		const guestsAllowed = getState().quiz.settings.Players.Guests;
		await runChecklist(socket, req, guestsAllowed ? 'guest' : 'user', 'limited');
		try {
			check(req.body, z.object({
				answer: z.string(),
			}));
			return setAnswer(req.token.username, req.body.answer);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_GAME_STATE, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		return getPublicCurrentGame(req.token?.role === 'admin');
	});
	router.route(WS_CMD.GET_LAST_KARAS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPlayedKarasInQuiz();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
