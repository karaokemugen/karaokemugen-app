import { Socket } from 'socket.io';

import { APIMessage } from '../../lib/services/frontend.js';
import { APIData } from '../../lib/types/api.js';
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
	router.route('startGame', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			await startGame(req.body.gamename, req.body.playlist, req.body.settings);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('stopGame', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			// When stopGame is triggered via API, we don't display scores
			await stopGame(false);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('deleteGame', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			await deleteGame(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('resetGameScores', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			await resetGameScores(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('continueGameSong', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			return continueGameSong();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getGames', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			return await getGames();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getGameScore', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getGameScore(req.body.gamename, req.body.login);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getTotalGameScore', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getTotalGameScore(req.body.gamename);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getPossibleAnswers', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPossibleAnswers(req.body.answer);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('setAnswer', async (socket: Socket, req: APIData) => {
		const guestsAllowed = getState().quiz.settings.Players.Guests;
		await runChecklist(socket, req, guestsAllowed ? 'guest' : 'user', 'limited');
		try {
			return setAnswer(req.token.username, req.body.answer);
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
	router.route('getGameState', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		return getPublicCurrentGame(req.token?.role === 'admin');
	});
	router.route('getLastKaras', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPlayedKarasInQuiz();
		} catch (err) {
			throw { code: err.code || 500, message: APIMessage(err.message) };
		}
	});
}
