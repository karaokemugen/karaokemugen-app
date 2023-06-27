import { Timer } from '../lib/utils/date.js';
import { acceptedAnswers } from '../services/quiz.js';
import { QuizGameConfig } from './config.js';
import { CurrentSong } from './playlist.js';

export type QuizAnswers = (typeof acceptedAnswers)[number];

export interface Game {
	gamename: string;
	settings: QuizGameConfig;
	state: GameState;
	date: Date;
	flag_active: boolean;
}

interface PlayerScore {
	login: string;
	points?: number;
	points_detailed?: {
		quickPoints: number;
		typePoints: number;
		type: QuizAnswers;
	};
}

export interface GameSong {
	song: CurrentSong;
	startTime: Date;
	guessTimer: Timer;
	quickGuessTimer: Timer;
	revealTimer: Timer;
	quickGuessOK: boolean;
	answers: GameAnswer[];
	winners: {
		login: string;
		awardedPoints: number;
		awardedPointsDetailed: {
			quickPoints: number;
			typePoints: number;
			type: QuizAnswers;
		};
	}[];
	state: 'guess' | 'answer';
	continue: boolean;
}

interface GameState {
	currentSongNumber: number;
	currentTotalDuration: number;
	currentQuizGame?: string;
	quizGuessingTime?: boolean;
	playlist: string;
	running: boolean;
	currentSong?: GameSong;
	KIDsPlayed: string[];
	guessTime?: number;
	quickGuess?: number;
	revealTime?: number;
	settings?: QuizGameConfig;
}

interface GameAnswer {
	login: string;
	answer?: string;
	answerType?: QuizAnswers;
	quickAnswer?: boolean;
	twitchAnswers?: Map<string, string>;
}

export interface GamePossibleAnswer {
	ktid?: string;
	type?: number;
	default_name?: string;
	default_language?: string;
	i18n?: any;
}

export interface GameScore extends PlayerScore {
	kid: string;
	answer: string;
	gamename: string;
}

interface CurrentGameRoundAnswers extends GameScore {
	quickAnswer: boolean;
}

export interface GameTotalScore {
	login: string;
	total: number;
}

export interface TotalTimes {
	guessTime: number;
	quickGuess: number;
	revealTime: number;
}
