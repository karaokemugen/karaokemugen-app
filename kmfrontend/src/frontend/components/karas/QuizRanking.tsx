import { RefObject, useContext, useEffect, useRef, useState } from 'react';
import { useAsyncMemo } from 'use-async-memo';

import i18next from 'i18next';
import { merge } from 'lodash';
import { Trans } from 'react-i18next';
import { KaraList as IKaraList } from '../../../../../src/lib/types/kara';
import { User } from '../../../../../src/lib/types/user';
import { GameSong, GameState, GameTotalScore, TotalTimes } from '../../../../../src/types/quiz';
import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { commandBackend, getSocket } from '../../../utils/socket';
import { acceptedAnswerToIcon } from '../../../utils/tagTypes';
import KaraList from './KaraList';
import QuizScore from './QuizScore';

function QuizRanking() {
	const context = useContext(GlobalContext);

	const [mode, setMode] = useState<'guess' | 'answer' | 'waiting'>('waiting');
	const [timeLeft, setTimeLeft] = useState(0);
	const [quickGuess, setQuickGuess] = useState(0);
	const [revealTimer, setRevealTimer] = useState(0);
	const [progressWidth, setProgressWidth] = useState('0px');
	const [progressColor, setProgressColor] = useState('forestgreen');
	const progressBarRef: RefObject<HTMLDivElement> = useRef();

	const quiz = context.globalState.settings.data.state.quiz;

	const userTotalScores = useAsyncMemo(
		async () => {
			const [users, scores]: [User[], GameTotalScore[]] = await Promise.all([
				commandBackend('getUsers'),
				commandBackend('getTotalGameScore', {
					gamename: quiz.currentQuizGame,
				}),
			]);
			const scoresToDisplay = scores
				.map(score => ({ ...score, nickname: users.find(u => u.login === score.login)?.nickname }))
				.filter(score => score.nickname != null);
			return scores ? scoresToDisplay : [];
		},
		[mode],
		[]
	);

	const karas = useAsyncMemo<IKaraList>(() => commandBackend('getLastKaras'), [mode], {
		content: [],
		infos: { from: 0, to: 0, count: 0 },
	});

	useEffect(() => {
		const qStart = (d: TotalTimes) => {
			setMode('guess');
			setTimeLeft(d.guessTime);
			setQuickGuess(d.quickGuess);
			setRevealTimer(d.revealTime);
		};
		const qResult = (d: GameSong) => {
			setMode('answer');
		};
		const updateQuizState = (gameState: GameState) => {
			merge(quiz, gameState);
		};

		commandBackend('getPlayerStatus').then(refreshPlayerInfos);
		commandBackend('getGameState').then(gameState => {
			updateQuizState(gameState);
			if (quiz.currentSong == null || quiz.currentSong?.state === 'guess') {
				qStart({
					guessTime: 0,
					quickGuess: 0,
					revealTime: 0,
				});
			} else if (quiz.currentSong?.state === 'answer') {
				qResult(quiz.currentSong);
			}
		});

		getSocket().on('quizStart', qStart);
		getSocket().on('quizResult', qResult);
		getSocket().on('playerStatus', refreshPlayerInfos);
		getSocket().on('quizStateUpdated', updateQuizState);
		return () => {
			getSocket().off('quizStart', qStart);
			getSocket().off('quizResult', qResult);
			getSocket().off('playerStatus', refreshPlayerInfos);
			getSocket().off('quizStateUpdated', updateQuizState);
		};
	}, []);

	const resultColor = (username: string) => {
		if (!quiz.running) {
			const maxPoints = Math.max(...userTotalScores?.map(score => score.total));
			const points = userTotalScores?.find(score => score.login === username)?.total;
			return maxPoints === points ? 'gold' : 'grey';
		}
		if (quiz.currentSong == null) {
			return 'white';
		}
		const maxPoints = Math.max(...quiz.currentSong?.winners.map(score => score.awardedPoints));
		const points = quiz.currentSong?.winners?.find(score => score.login === username)?.awardedPoints;
		if (!points) {
			return 'grey';
		} else if (points === maxPoints) {
			return 'lime';
		}
		return 'goldenrod';
	};

	useEffect(() => {
		setProgressColor(resultColor(context.globalState.auth.data.username));
	}, [quiz.currentSong]);

	const refreshPlayerInfos = async (data: PublicPlayerState) => {
		const timeSettings = quiz.settings.TimeSettings;
		const element = progressBarRef.current;
		if (element && data.quiz !== undefined) {
			setTimeLeft(Math.floor(data.quiz.guessTime));
			setQuickGuess(Math.floor(data.quiz.quickGuess));
			setRevealTimer(Math.floor(data.quiz.revealTime));
			let newWidth = 0;
			if (data.quiz.guessTime > 0) {
				newWidth = (timeSettings.GuessingTime - data.quiz.guessTime) / timeSettings.GuessingTime;
			} else if (data.quiz.revealTime > 0) {
				newWidth = (timeSettings.AnswerTime - data.quiz.revealTime) / timeSettings.AnswerTime;
			}
			setProgressWidth(`${newWidth * progressBarRef.current.offsetWidth}px`);
		}
		if (data.playerStatus) {
			if (data.playerStatus === 'stop') {
				setProgressWidth('0px');
			}
		}
	};

	return (
		<>
			<div className="player-box quiz">
				<div className="title">
					<div>
						<div
							className="tag inline white"
							style={{
								width: '100%',
								minHeight: '50px',
								display: 'flex',
								justifyContent: 'center',
								flexDirection: 'column',
							}}
						>
							<span>
								{mode === 'guess' && quiz.settings.Answers.QuickAnswer.Enabled && quickGuess > 0 ? (
									<>
										<i className="fas fa-fw fa-person-running" />{' '}
										{i18next.t('QUIZ.STATES.QUICK_GUESSING', { count: quickGuess })}
									</>
								) : mode === 'guess' && timeLeft > 0 ? (
									<>
										<i className="fas fa-fw fa-person-walking" />{' '}
										{i18next.t('QUIZ.STATES.GUESSING', { count: timeLeft })}
									</>
								) : mode === 'answer' ? (
									<>
										<i className="fas fa-fw fa-person" />{' '}
										{i18next.t('QUIZ.STATES.NEXT_SONG', { count: revealTimer })}
									</>
								) : (
									<>
										<i className="fas fa-fw fa-hourglass" /> {i18next.t('QUIZ.STATES.WAITING')}
									</>
								)}
							</span>
						</div>
					</div>
				</div>
				<div>
					<div className="progress-bar-container" ref={progressBarRef}>
						<div
							className="progress-bar"
							style={{ width: progressWidth, backgroundColor: progressColor }}
						/>
					</div>
				</div>
			</div>
			<QuizScore />
			<details className="rules">
				<summary>{i18next.t('QUIZ.RULES.TITLE')}</summary>
				<div>
					<p>
						<Trans
							t={i18next.t}
							i18nKey="QUIZ.RULES.GUESS_TIME"
							components={{
								1: <strong />,
							}}
							values={{
								seconds: quiz.settings.TimeSettings.GuessingTime,
							}}
						/>
						{quiz.settings.Answers.QuickAnswer.Enabled ? (
							<>
								<br />
								<i className={`fas fa-bolt fa-fw`}></i>{' '}
								<Trans
									t={i18next.t}
									i18nKey="QUIZ.RULES.QUICK_ANSWER"
									components={{
										1: <strong />,
									}}
									values={{
										seconds: quiz.settings.TimeSettings.QuickGuessingTime,
										points: quiz.settings.Answers.QuickAnswer.Points,
									}}
								/>
							</>
						) : null}
					</p>
					<p>{i18next.t('QUIZ.RULES.ACCEPTED_ANSWERS')}</p>
					<ul>
						{Object.entries(quiz.settings.Answers.Accepted)
							.filter(([_, { Enabled }]) => Enabled)
							.map(([possibleAnswerType, { Points }]) => (
								<li key={possibleAnswerType}>
									<i className={`fas fa-${acceptedAnswerToIcon(possibleAnswerType)} fa-fw`}></i>
									{i18next.t(
										possibleAnswerType === 'title'
											? 'KARA.TITLE'
											: possibleAnswerType === 'year'
											  ? 'KARA.YEAR'
											  : `TAG_TYPES.${possibleAnswerType.toUpperCase()}_other`
									)}{' '}
									{i18next.t('QUIZ.RULES.ACCEPTED_ANSWERS_POINTS', { points: Points })}
								</li>
							))}
					</ul>
					<p>{i18next.t('QUIZ.RULES.END_GAME')}</p>
					<ul>
						{Object.values(quiz.settings.EndGame)
							.filter(eg => eg.Enabled)
							.map(eg => {
								if ('Score' in eg) {
									return (
										<li key="MaxScore">
											<Trans
												t={i18next.t}
												i18nKey="QUIZ.RULES.MAX_SCORE"
												components={{
													1: <strong />,
												}}
												values={{
													points: quiz.settings.EndGame.MaxScore.Score,
												}}
											/>
										</li>
									);
								} else if ('Songs' in eg) {
									return (
										<li key="MaxSongs">
											<Trans
												t={i18next.t}
												i18nKey="QUIZ.RULES.MAX_SONGS"
												components={{
													1: <strong />,
												}}
												values={{
													count:
														quiz.settings.EndGame.MaxSongs.Songs - quiz.currentSongNumber,
												}}
											/>
										</li>
									);
								} else if ('Minutes' in eg) {
									return (
										<li key="MaxMinutes">
											<Trans
												t={i18next.t}
												i18nKey="QUIZ.RULES.DURATION"
												components={{
													1: <strong />,
												}}
												values={{
													count:
														quiz.settings.EndGame.Duration.Minutes -
														quiz.currentTotalDuration / 60,
												}}
											/>
										</li>
									);
								} else {
									// This shouldn't happen.
									return null;
								}
							})}
						<li>{i18next.t('QUIZ.RULES.END_OF_PLAYLIST')}</li>
					</ul>
				</div>
			</details>
			<details>
				<summary>{i18next.t('QUIZ.PREVIOUS_KARAOKES')}</summary>
				<KaraList karas={karas} scope="public" />
			</details>
		</>
	);
}

export default QuizRanking;
