import { Socket } from 'socket.io';

import { APIData } from '../../lib/types/api.js';
import { getConfig } from '../../lib/utils/config.js';
import { SocketIOApp } from '../../lib/utils/ws.js';
import {
	continueGameSong,
	deleteGame,
	getCurrentGame,
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
import { APIMessage, errMessage } from '../common.js';
import { runChecklist } from '../middlewares.js';

export default function quizController(router: SocketIOApp) {
	router.route('startGame', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			await startGame(req.body.gamename, req.body.playlist, req.body.settings);
		} catch (err) {
			errMessage(err.msg);
			throw { code: 500, message: APIMessage(err.msg) };
		}
	});
	router.route('stopGame', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			// When stopGame is triggered via API, we don't display scores
			await stopGame(false);
		} catch (err) {
			errMessage(err.msg);
			throw { code: 500, message: APIMessage(err.msg) };
		}
	});
	router.route('deleteGame', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			await deleteGame(req.body.gamename);
		} catch (err) {
			errMessage(err.msg);
			throw { code: 500, message: APIMessage(err.msg) };
		}
	});
	router.route('resetGameScores', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			await resetGameScores(req.body.gamename);
		} catch (err) {
			errMessage(err.msg);
			throw { code: 500, message: APIMessage(err.msg) };
		}
	});
	router.route('continueGameSong', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			return continueGameSong();
		} catch (err) {
			errMessage(err.msg);
			throw { code: 500, message: APIMessage(err.msg) };
		}
	});
	router.route('getGames', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'admin', 'limited');
		try {
			return await getGames();
		} catch (err) {
			errMessage(err.message);
			throw { code: err?.code || 500, message: APIMessage(err.msg) };
		}
	});
	router.route('getCurrentGameSong', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return getCurrentGame(req.token?.role === 'admin').currentSong;
		} catch (err) {
			errMessage(err.message);
			throw { code: err?.code || 500, message: APIMessage(err.msg) };
		}
	});
	router.route('getGameScore', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getGameScore(req.body.gamename, req.body.login);
		} catch (err) {
			errMessage(err.message);
			throw { code: err?.code || 500, message: APIMessage(err.msg) };
		}
	});
	router.route('getTotalGameScore', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getTotalGameScore(req.body.gamename);
		} catch (err) {
			errMessage(err.message);
			throw { code: err?.code || 500, message: APIMessage(err.msg) };
		}
	});
	router.route('getPossibleAnswers', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPossibleAnswers(req.body.answer);
		} catch (err) {
			errMessage(err.message);
			throw { code: err?.code || 500, message: APIMessage(err.msg) };
		}
	});
	router.route('setAnswer', async (socket: Socket, req: APIData) => {
		const guestsAllowed = getConfig().Karaoke.QuizMode.Players.Guests;
		await runChecklist(socket, req, guestsAllowed ? 'guest' : 'user', 'limited');
		try {
			return setAnswer(req.token.username, req.body.answer);
		} catch (err) {
			errMessage(err.message);
			throw { code: err?.code || 500, message: APIMessage(err.msg) };
		}
	});
	router.route('getGameState', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		return getCurrentGame(req.token?.role === 'admin');
	});
	router.route('getLastKaras', async (socket: Socket, req: APIData) => {
		await runChecklist(socket, req, 'guest', 'limited');
		try {
			return await getPlayedKarasInQuiz();
		} catch (err) {
			errMessage(err.message);
			throw { code: err?.code || 500, message: APIMessage(err.msg) };
		}
	});
}
