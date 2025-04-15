import { WS_CMD } from '../../../kmfrontend/src/utils/ws.js';
import { APIMessage } from '../../lib/services/frontend.js';
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

export default function quizController(router: SocketIOApp) {
	router.route(WS_CMD.START_GAME, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
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
			await deleteGame(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.RESET_GAME_SCORES, async (socket, req) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
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
			return await getGameScore(req.body.gamename, req.body.login);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_TOTAL_GAME_SCORE, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getTotalGameScore(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.GET_POSSIBLE_ANSWERS, async (socket, req) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPossibleAnswers(req.body.answer);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route(WS_CMD.SET_ANSWER, async (socket, req) => {
		const guestsAllowed = getState().quiz.settings.Players.Guests;
		await runChecklist(socket, req, guestsAllowed ? 'guest' : 'user', 'limited');
		try {
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
