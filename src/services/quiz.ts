import levenshtein from 'damerau-levenshtein';
import i18next from 'i18next';

import { isShutdownInProgress } from '../components/engine.js';
import {
	dropGame,
	fillPossibleAnswers,
	insertGame,
	insertScore,
	selectGames,
	selectPossibleAnswers,
	selectScores,
	selectTotalScores,
	truncateScores,
	updateGame,
} from '../dao/quiz.js';
import { DBKara, DBKaraTag } from '../lib/types/database/kara.js';
import { KaraList } from '../lib/types/kara.js';
import { getConfig } from '../lib/utils/config.js';
import { tagTypes } from '../lib/utils/constants.js';
import { Timer } from '../lib/utils/date.js';
import { ErrorKM } from '../lib/utils/error.js';
import logger from '../lib/utils/logger.js';
import { isUUID } from '../lib/utils/validators.js';
import { emitWS } from '../lib/utils/ws.js';
import { QuizGameConfig } from '../types/config.js';
import { SongModifiers } from '../types/player.js';
import { CurrentSong } from '../types/playlist.js';
import { GameAnswer, QuizAnswers, TotalTimes } from '../types/quiz.js';
import Sentry from '../utils/sentry.js';
import { getState, setState } from '../utils/state.js';
import { sayTwitch } from '../utils/twitch.js';
import { getKaras } from './kara.js';
import { displayMessage, getPromoMessage, next, sendCommand, stopPlayer } from './player.js';
import { editPlaylist } from './playlist.js';
import { getTag } from './tag.js';
import { createUser, editUser, getUser, getUsers } from './user.js';

const service = 'Quiz';

export const acceptedAnswers = [...Object.keys(tagTypes), 'year', 'title'];

export function checkIfSongIsQuizzable(kara: DBKara) {
	// Check if the song has at least one answer possible from possible answer types
	// Whichever answer type we get to first that exists in a song breaks the loop.
	let answerPossible = false;
	for (const [possibleAnswerType, { Enabled }] of Object.entries(getState().quiz.settings.Answers.Accepted)) {
		if (!Enabled) {
			continue;
		}
		// Skipping title as all songs have titles... right? RIGHT?
		if (possibleAnswerType === 'title') {
			answerPossible = true;
		} else if (possibleAnswerType === 'year' && kara.year) {
			answerPossible = true;
		} else if (possibleAnswerType !== 'year' && kara[possibleAnswerType]?.length > 0) {
			answerPossible = true;
		}
		if (answerPossible) break;
	}
	if (!answerPossible) throw '[Quiz Mode] Song has no possible answer for the criterias selected for this game';
}

function translateQuizAnswers(quizAnswer: QuizAnswers) {
	switch (quizAnswer) {
		case 'year':
			return i18next.t('YEAR');
		case 'title':
			return i18next.t('TITLE');
		default:
			return i18next.t(`TAG_TYPES.${quizAnswer.toUpperCase()}`);
	}
}

export async function buildEndGameScoreString(): Promise<string> {
	const [users, scores] = await Promise.all([getUsers({}), getTotalGameScore(getState().quiz.currentQuizGame)]);
	const sizeMax = 100;
	const leaderboards = [];
	// Build leaderboard for the first only 10
	const scoresToDisplay = scores
		.map(score => ({ ...score, nickname: users.find(u => u.login === score.login)?.nickname }))
		.filter(score => score.nickname)
		.slice(0, 10);

	for (const [pos, score] of scoresToDisplay.entries()) {
		// Reduce size of text with each member in the leaderboards
		const size = sizeMax - pos * 5;
		leaderboards.push(
			`{\\fscx${size}{\\fscy${size}}${pos + 1}. ${score.nickname} (${i18next.t('QUIZ_SCORES.PLAYER_POINTS', {
				points: score.total,
			})})`
		);
	}
	const scoresString = [
		'{\\fscx90}{\\fscy90}',
		`{\\u1}${i18next.t('QUIZ_SCORES.SCORES')}{\\u0}`,
		'',
		...leaderboards,
	];
	return scoresString.join('\\N');
}

export function buildRulesString() {
	const gameSettings = getState().quiz.settings;
	const rules = [
		'{\\fscx60}{\\fscy60}',
		`{\\u1}${i18next.t('QUIZ_RULES.TITLE')}{\\u0}`,
		'',
		i18next.t('QUIZ_RULES.GUESS_TIME', { seconds: gameSettings.TimeSettings.GuessingTime }),
		'',
		`{\\u1}${i18next.t('QUIZ_RULES.SCORE')}{\\u0}`,
		'',
		gameSettings.Answers.QuickAnswer.Enabled
			? i18next.t('QUIZ_RULES.QUICK_ANSWER', {
					seconds: gameSettings.TimeSettings.QuickGuessingTime,
					points: gameSettings.Answers.QuickAnswer.Points,
				})
			: null,
		'',
		`${i18next.t('QUIZ_RULES.ACCEPTED_ANSWERS')} ${Object.keys(gameSettings.Answers.Accepted)
			.filter(a => gameSettings.Answers.Accepted[a].Enabled)
			.map(
				(a: QuizAnswers) =>
					`${translateQuizAnswers(a)} ${i18next.t('QUIZ_RULES.ACCEPTED_ANSWERS_POINTS', {
						points: gameSettings.Answers.Accepted[a].Points,
					})}`
			)
			.join(', ')}`,
		'',
		`{\\u1}${i18next.t('QUIZ_RULES.END_GAME')}{\\u0}`,
		'',
		gameSettings.EndGame.MaxScore.Enabled
			? i18next.t('QUIZ_RULES.MAX_SCORE', { points: gameSettings.EndGame.MaxScore.Score })
			: null,
		gameSettings.EndGame.Duration.Enabled
			? i18next.t('QUIZ_RULES.DURATION', {
					duration: gameSettings.EndGame.Duration.Minutes - getState().quiz.currentTotalDuration / 60,
				})
			: null,
		gameSettings.EndGame.MaxSongs.Enabled
			? i18next.t('QUIZ_RULES.MAX_SONGS', {
					songs: gameSettings.EndGame.MaxSongs.Songs - getState().quiz.currentSongNumber,
				})
			: null,
		i18next.t('QUIZ_RULES.END_OF_PLAYLIST'),
		'',
		getPromoMessage(),
	]
		.filter(e => e !== null)
		.map(str => str.replace(/<1>/g, '{\\b1}').replace(/<\/1>/g, '{\\b0}'));
	return rules.join('\\N');
}

export async function shouldGameEnd() {
	const gameState = getState().quiz;
	if (gameState.running) {
		const gameSettings = gameState.settings;
		// Endgame checks
		// does someone have reached MaxScore ||
		// does the song count reaches MaxSongs ||
		// does the timer reaches Duration
		return (
			(gameSettings.EndGame.MaxScore.Enabled &&
				(await getTotalGameScore(getState().quiz.currentQuizGame)).some(
					e => e.total >= gameSettings.EndGame.MaxScore.Score
				)) ||
			(gameSettings.EndGame.MaxSongs.Enabled &&
				gameState.currentSongNumber >= gameSettings.EndGame.MaxSongs.Songs) ||
			(gameSettings.EndGame.Duration.Enabled &&
				gameState.currentTotalDuration >= gameSettings.EndGame.Duration.Minutes * 60)
		);
	}
	return true;
}

export function startQuizRound(kara: CurrentSong): number {
	// Calculate start time, and various durations depending on the song we have.
	const gameState = getState().quiz;
	if (!gameState.running) return 0;
	const quizTimes = gameState.settings.TimeSettings;
	const { start, karaDuration, guessingDuration, quickGuessDuration, revealDuration } = computeDurations(
		kara.duration,
		quizTimes
	);
	gameState.currentSong = {
		song: kara,
		startTime: new Date(),
		quickGuessOK: gameState.settings.Answers.QuickAnswer.Enabled,
		answers: [],
		winners: [],
		guessTimer: new Timer(guessingDuration * 1000),
		quickGuessTimer: new Timer(quickGuessDuration * 1000),
		revealTimer: new Timer(revealDuration * 1000, false),
		state: 'guess',
		continue: false,
	};
	setState({ quiz: { currentSong: gameState.currentSong } });
	emitWS('quizStart', {
		guessTime: karaDuration,
		quickGuess: quickGuessDuration,
		revealTime: revealDuration,
	});
	startAcceptingAnswers(revealDuration);
	return start;
}

function computeDurations(
	karaDuration: number,
	quizTimes: { WhenToStartSong: number; GuessingTime: number; QuickGuessingTime: number; AnswerTime: number }
) {
	let guessingDuration = quizTimes.GuessingTime;
	// Quick guess cannot be greater than guess duration
	let quickGuessDuration = Math.min(karaDuration, quizTimes.QuickGuessingTime);
	// Find out which percentage of guessingDuration quickGuessing is.
	// This will help later.
	const quickGuessPercent = Math.floor((quickGuessDuration / guessingDuration) * 100);
	let revealDuration = quizTimes.AnswerTime;

	let start = Math.ceil(karaDuration * (quizTimes.WhenToStartSong / 100));
	// Let's find out how big our reveal time can be as we add start and guessing time compared to song duration
	const revealTimePossible = karaDuration - (start + quizTimes.GuessingTime);
	// If revealTimePossible is under reveal time in config and under 10 seconds (absolute lowest we should allow actually)
	if (revealTimePossible < quizTimes.AnswerTime && revealTimePossible < 10) {
		// Let's move our start time back to at least allow 10 seconds of revealtime
		// If even that is not possible (we get a negative start) we start at the beginning of the song.
		start -= 10 - revealTimePossible;
		if (start < 0) start = 0;
		if (quizTimes.GuessingTime > karaDuration - 10) {
			revealDuration = 10;
			guessingDuration = karaDuration - 10;
			quickGuessDuration = Math.floor((guessingDuration / 100) * quickGuessPercent);
		}
	}
	return { start, karaDuration, guessingDuration, quickGuessDuration, revealDuration };
}

// Timer for answering questions
export async function startAcceptingAnswers(revealDuration: number) {
	const gameState = getState().quiz;
	if (!gameState.running) return;
	setState({ quiz: { quizGuessingTime: true } });
	const song = gameState.currentSong;
	const internalDate = song.startTime;
	song.quickGuessTimer.wait().then(() => {
		song.quickGuessOK = false;
	});
	await song.guessTimer.wait();
	// This is to make sure that we trigger the answers function ONLY if our internalDate is the same as the state's start time.
	// If the state's start time has been modified it means another round has started. Maybe the admin skipped a song?
	// (we also check that the game is still running)
	if (!gameState.running || internalDate !== gameState.currentSong.startTime) return;
	stopAcceptingAnswers();
	if (revealDuration > 0) {
		const revealModifiers: SongModifiers = {
			Blind: '',
			NoLyrics: false,
			Mute: false,
		};
		sendCommand('setModifiers', revealModifiers);
		song.revealTimer.start();
		song.state = 'answer';
		await song.revealTimer.wait();
	}
	// Let the song end if continue is enabled
	if (gameState.currentSong.continue) return;
	// Check if the game should end
	if (gameState.running && (await shouldGameEnd())) {
		stopGame(true);
	} else {
		// Let's check again.
		if (!gameState.running) return;
		if (internalDate !== gameState.currentSong.startTime) return;
		if (getState().stopping) await stopPlayer();
		next().catch(() => {});
	}
}

function testAnswer(answer: string, input: string) {
	const gameState = getState().quiz;
	const minimumScore = gameState.settings.Answers.SimilarityPercentageNeeded;
	const lev = levenshtein(input.toLowerCase(), answer.toLowerCase());
	return lev.similarity * 100 > minimumScore;
}

/** Used to translate possible UUIDs to songs or tag names for storage in DB */
async function determineAnswerString(answer: GameAnswer, songString: string): Promise<string> {
	if (answer.answerType === 'year') {
		return answer.answer;
	}
	if (answer.answerType === 'title') {
		if (isUUID(answer.answer)) return songString;
		return answer.answer;
	}
	// All else are tagtypes and we'll need the tag's info
	if (isUUID(answer.answer)) {
		const tag = await getTag(answer.answer);
		return tag.name;
	}
	// If not UUID we return the answer as-is.
	return answer.answer;
}

/** Stops accepting answers for a song and reveals answers and counts points */
export async function stopAcceptingAnswers() {
	const gameState = getState().quiz;
	if (!gameState.running) return;
	setState({ quiz: { quizGuessingTime: false } });
	const streamConfig = getConfig().Karaoke.StreamerMode;
	const conf = gameState.settings;
	const twitchEnabled = streamConfig.Twitch.Enabled && streamConfig.Twitch.Channel && conf.Players.Twitch;
	// Copying song object so we can avoid people submitting answers late.
	const song = { ...gameState.currentSong };
	const songString = song.song.songname;
	if (gameState.currentSong.answers.length > 0) {
		if (twitchEnabled) computeTwitchAnswer();
		const winners: {
			login: string;
			awardedPoints: number;
			awardedPointsDetailed: {
				quickPoints: number;
				typePoints: number;
				type: QuizAnswers;
			};
		}[] = [];
		for (const answer of song.answers) {
			const login = answer.login;
			let goodAnswer = false;
			const awardedPointsDetailed: {
				quickPoints: number;
				typePoints: number;
				type: QuizAnswers;
			} = {
				quickPoints: 0,
				type: null,
				typePoints: 0,
			};
			logger.info(`Answer from ${login}: ${JSON.stringify(answer)}`, { service });
			// Function registering a good answer from a player.
			const niceOne = (type: QuizAnswers) => {
				goodAnswer = true;
				answer.answerType = type;
				awardedPointsDetailed.type = type;
				awardedPointsDetailed.typePoints = conf.Answers.Accepted[type].Points;
			};
			for (const [acceptedAnswerType, { Enabled }] of Object.entries(gameState.settings.Answers.Accepted)) {
				if (!Enabled) {
					continue;
				}
				switch (acceptedAnswerType as QuizAnswers) {
					case 'year':
						// Year answer needs to be precise.
						if (+answer.answer === song.song.year) niceOne('year');
						break;
					case 'title':
						if (answer.answer === song.song.kid) {
							niceOne('title');
							break;
						}
						for (const lang of Object.keys(song.song.titles)) {
							if (testAnswer(song.song.titles[lang], answer.answer)) {
								niceOne('title');
								break;
							}
						}
						if (goodAnswer) break;
						for (const alias of song.song.titles_aliases) {
							if (testAnswer(alias, answer.answer)) {
								niceOne('title');
								break;
							}
						}
						break;
					default:
						// This is a tagType, if neither year or title
						const tags: DBKaraTag[] = song.song[acceptedAnswerType];
						if (tags)
							for (const tag of tags) {
								if (tag.tid === answer.answer) {
									niceOne(acceptedAnswerType);
									break;
								}
								for (const lang of Object.keys(tag.i18n)) {
									if (testAnswer(tag.i18n[lang], answer.answer)) {
										niceOne(acceptedAnswerType);
										break;
									}
								}
								if (goodAnswer) break;
								for (const alias of tag.aliases) {
									if (testAnswer(alias, answer.answer)) {
										niceOne(acceptedAnswerType);
										break;
									}
								}
								if (goodAnswer) break;
							}
						break;
				}
				if (goodAnswer) break;
			}
			if (goodAnswer) {
				if (answer.quickAnswer) awardedPointsDetailed.quickPoints = conf.Answers.QuickAnswer.Points;
				winners.push({
					login,
					awardedPointsDetailed,
					awardedPoints: awardedPointsDetailed.quickPoints + awardedPointsDetailed.typePoints,
				});
			}
			insertScore({
				login,
				points: awardedPointsDetailed.quickPoints + awardedPointsDetailed.typePoints,
				points_detailed: awardedPointsDetailed,
				kid: song.song.kid,
				answer: await determineAnswerString(answer, songString),
				gamename: getState().quiz.currentQuizGame,
			});
		}
		logger.info(`Players with the good answer: ${winners.map(winner => winner.login).join(', ')}`, { service });
		gameState.currentSong.winners = winners;
	}
	if (twitchEnabled) {
		displayGoodAnswerTwitch(songString);
	}

	// Save kara to history
	addPlayedKaraToQuiz(gameState.currentSong.song.kid);
	gameState.currentSongNumber += 1;
	gameState.currentTotalDuration += conf.TimeSettings.GuessingTime + conf.TimeSettings.AnswerTime;

	// Update game state
	updateGame(getState().quiz.currentQuizGame, conf, gameState);
	emitWS('quizResult', gameState.currentSong);
	setState({ quiz: gameState });
}

export function setQuizModifier(): SongModifiers {
	const conf = getState().quiz.settings;
	return {
		Mute: false,
		Blind: '',
		NoLyrics: false,
		...conf.Modifiers,
	};
}

export function continueGameSong() {
	const gameState = getState().quiz;
	if (!gameState.running || !gameState.currentSong) return;
	gameState.currentSong.continue = !gameState.currentSong.continue;
	setState({ quiz: gameState });
	return gameState.currentSong.continue;
}

export async function startGame(gamename: string, playlist: string, settings?: QuizGameConfig) {
	try {
		if (getState().quiz.running === true) {
			throw new ErrorKM('QUIZZ_ALREADY_IN_PROGRESS', 409, false);
		}
		if (!playlist) {
			throw new ErrorKM('INVALID_DATA', 400, false);
		}
		if (settings) {
			for (const answer of Object.values(settings.Answers.Accepted)) {
				if (answer.Enabled && !answer.Points) {
					throw new ErrorKM('INVALID_DATA', 400, false);
				}
			}
		}
		const games = await selectGames();
		const game = games.find(g => g.gamename === gamename);
		if (!game) {
			// Load default game settings if not provided
			if (!settings) {
				settings = getState().quiz.settings;
			}
			setState({
				quiz: {
					running: true,
					currentSongNumber: 0,
					currentTotalDuration: 0,
					// This presupposes the playlist is already created.
					playlist,
					KIDsPlayed: [],
				},
			});
			insertGame({
				gamename,
				settings,
				state: getState().quiz,
				date: new Date(),
				flag_active: true,
			});
		} else {
			// Load game settings
			if (!settings) {
				settings = game.settings;
			}
			setState({
				quiz: {
					...game.state,
					running: true,
					playlist,
				},
			});
			updateGame(gamename, settings, getState().quiz);
		}
		setState({ quiz: { settings, running: true, currentQuizGame: gamename } });
		emitWS('settingsUpdated', {});
		await editPlaylist(playlist, {
			flag_current: true,
			flag_visible: false,
		});
		await stopPlayer(true);
		await displayMessage(buildRulesString(), -1, 4, 'quizRules');
		await fillPossibleAnswers(
			Object.keys(settings.Answers.Accepted).filter(a => settings.Answers.Accepted[a].Enabled)
		);
		logger.info('Game started.', { service });
		if (settings.Players.Twitch) {
			if (!(await getUser('twitchUsers'))) {
				await createUser(
					{
						login: 'twitchUsers',
						type: 2,
						nickname: settings.Players.TwitchPlayerName || 'Twitch Users',
					},
					{
						createRemote: false,
						noPasswordCheck: true,
					}
				);
			} else {
				await editUser(
					'twitchUsers',
					{
						login: 'twitchUsers',
						nickname: settings.Players.TwitchPlayerName || 'Twitch Users',
					},
					null,
					'admin'
				);
			}
		}
	} catch (err) {
		logger.error(`Error starting game : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_START_ERROR');
	}
}

export async function stopGame(displayScores = true) {
	try {
		const gameState = getState().quiz;
		if (!gameState.running) return;
		setState({ quiz: { quizGuessingTime: false } });
		logger.info('Stopping game and saving state', { service });
		if (!isShutdownInProgress()) {
			await stopPlayer(true, false);
			if (displayScores) {
				await displayMessage(await buildEndGameScoreString(), -1, 8, 'quizScores');
			} else {
				setState({ quiz: { running: false } });
			}
		}
		await updateGame(gameState.currentQuizGame, gameState.settings, gameState, false);
		emitWS('settingsUpdated', {});
	} catch (err) {
		logger.error(`Error stopping game : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_STOP_ERROR');
	}
}

export async function deleteGame(gamename: string) {
	try {
		if (getState().quiz.currentQuizGame === gamename) {
			await stopGame();
		}
		await dropGame(gamename);
	} catch (err) {
		logger.error(`Error stopping game : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_DELETE_ERROR');
	}
}

export function addPlayedKaraToQuiz(kid: string) {
	const gameState = getState().quiz;
	if (!gameState.running) return;
	gameState.KIDsPlayed.push(kid);
	setState({ quiz: { KIDsPlayed: gameState.KIDsPlayed } });
}

export async function getPlayedKarasInQuiz(): Promise<KaraList> {
	try {
		const karasFromDB = await getKaras({
			q: `k:${getState().quiz.KIDsPlayed.join(',')}`,
		});
		// Reorder them with our initial order
		const karas = [];
		for (const kid of getState().quiz.KIDsPlayed) {
			karas.push(karasFromDB.content.find(k => k.kid === kid));
		}
		karasFromDB.content = karas;
		return karasFromDB;
	} catch (err) {
		logger.error(`Error getting last songs for game : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_GET_LAST_SONGS_ERROR');
	}
}

export async function resetGameScores(gamename: string) {
	try {
		await truncateScores(gamename);
		const games = await selectGames();
		const game = games.find(g => g.gamename === gamename);
		if (game) {
			game.state = {
				running: false,
				currentSongNumber: 0,
				currentTotalDuration: 0,
				playlist: '',
				KIDsPlayed: [],
			};
			await updateGame(game.gamename, game.settings, game.state, game.flag_active);
		}
	} catch (err) {
		logger.error(`Error resetting game scores : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_RESET_SCORES_ERROR');
	}
}

export async function getGames() {
	try {
		return await selectGames();
	} catch (err) {
		logger.error(`Error getting games : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_GET_GAMES_ERROR');
	}
}

export async function getGameScore(gamename: string, user?: string) {
	try {
		return await selectScores(gamename, user);
	} catch (err) {
		logger.error(`Error getting game scores : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_GET_GAME_SCORES_ERROR');
	}
}

export async function getTotalGameScore(gamename: string) {
	try {
		return await selectTotalScores(gamename);
	} catch (err) {
		logger.error(`Error getting total game scores : ${err}`, { service });
		Sentry.error(err);
		throw err instanceof ErrorKM ? err : new ErrorKM('QUIZZ_GET_TOTAL_GAME_SCORES_ERROR');
	}
}

export async function getPossibleAnswers(words: string) {
	return selectPossibleAnswers(words);
}

export function getCurrentSongTimers(): TotalTimes {
	const gameState = getState().quiz;
	if (!gameState.running)
		return {
			guessTime: 0,
			revealTime: 0,
			quickGuess: 0,
		};
	return {
		guessTime: gameState.currentSong.guessTimer.getTimeLeft() / 1000,
		quickGuess: gameState.currentSong.quickGuessOK ? gameState.currentSong.quickGuessTimer.getTimeLeft() / 1000 : 0,
		revealTime: gameState.currentSong.revealTimer.getTimeLeft() / 1000,
	};
}

export function setAnswer(login: string, input: string) {
	const gameState = getState().quiz;
	if (!gameState.running) return 'NOT_IN_QUIZ';
	if (gameState.currentSong.state !== 'guess') return 'TOO_LATE';
	// Find the answer in our list of answers already given
	let answer = gameState.currentSong.answers.find(a => a.login === login);
	if (!answer) {
		answer = {
			login,
		};
		gameState.currentSong.answers.push(answer);
	}
	// If an answer has already been given by this player or if it's a new answer, we update it with the input given.
	answer.answer = input;
	answer.quickAnswer = gameState.currentSong.quickGuessOK;
	setState({ quiz: gameState });
	return gameState.currentSong.quickGuessOK ? 'OK_QUICK' : 'OK';
}

async function displayGoodAnswerTwitch(song: string) {
	try {
		await sayTwitch(`${i18next.t('GOOD_ANSWER')}: ${song}`);
	} catch (err) {
		// Non fatal
	}
}

/** Register an answer from a twitch user */
export function registerTwitchAnswer(login: string, answer: string) {
	const gameState = getState().quiz;
	if (!gameState.running) return;
	const song = gameState.currentSong;
	let twitch = song.answers.find(a => a.login === 'twitchUsers');
	if (!twitch) {
		twitch = {
			login: 'twitchUsers',
			twitchAnswers: new Map(),
		};
		song.answers.push(twitch);
	}
	twitch.twitchAnswers.set(login, answer.toLowerCase());
	setState({ quiz: gameState });
}

/** Select the most returned answer */
function computeTwitchAnswer() {
	const gameState = getState().quiz;
	if (!gameState.running) return;
	const twitchAnswer = gameState.currentSong.answers.find(a => a.login === 'twitchUsers');
	if (!twitchAnswer) return;
	const answers = [...twitchAnswer.twitchAnswers.values()];
	// Find out which is the most given answer
	// Thank you Stackoverflow
	twitchAnswer.answer = answers.reduce(
		(a, b, _i, arr) => (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b),
		null
	);
	setState({ quiz: gameState });
}
