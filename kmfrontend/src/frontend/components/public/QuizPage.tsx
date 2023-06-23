import './QuizPage.scss';

import { debounce, merge, uniqBy } from 'lodash';
import { RefObject, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAsyncMemo } from 'use-async-memo';

import i18next from 'i18next';
import { Trans } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { KaraList as IKaraList } from '../../../../../src/lib/types/kara';
import { User } from '../../../../../src/lib/types/user';
import {
	GamePossibleAnswer,
	GameSong,
	GameState,
	GameTotalScore,
	QuizAnswers,
	TotalTimes,
} from '../../../../../src/types/quiz';
import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { getTitleInLocale } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { acceptedAnswerToIcon } from '../../../utils/tagTypes';
import AutocompleteQuiz, { AutocompleteOption, AutocompleteOptions } from '../generic/AutocompleteQuiz';
import KaraList from '../karas/KaraList';

export default function QuizPage() {
	const navigate = useNavigate();
	const context = useContext(GlobalContext);

	const [suggestions, setSuggestions] = useState<AutocompleteOptions>([]);
	const [answer, setAnswer] = useState('');
	const answerConfirmed = useRef(false);
	const [mode, setMode] = useState<'guess' | 'answer' | 'waiting'>('waiting');
	const [timeLeft, setTimeLeft] = useState(0);
	const [quickGuess, setQuickGuess] = useState(0);
	const [revealTimer, setRevealTimer] = useState(0);
	const [result, setResult] = useState<GameSong>();
	const [progressWidth, setProgressWidth] = useState('0px');
	const [progressColor, setProgressColor] = useState('forestgreen');
	const [responseMode, setResponseMode] = useState<'TOO_LATE' | 'OK' | 'OK_QUICK' | 'NOT_IN_QUIZ'>();
	const [awardedPoints, setAwardedPoints] = useState(0);
	const [awardedPointsDetailed, setAwardedPointsDetailed] = useState<{
		quickPoints: number;
		typePoints: number;
		type: QuizAnswers;
	}>();
	const [answerSnapshot, setAnswerSnapshot] = useState('');
	const [focus, setFocus] = useState(true);
	const [disabled, setDisabled] = useState(false);
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
			setAnswer('');
			answerConfirmed.current = false;
			setSuggestions([]);
			setMode('guess');
			setTimeLeft(d.guessTime);
			setQuickGuess(d.quickGuess);
			setRevealTimer(d.revealTime);
			setResponseMode(null);
			setAnswerSnapshot('');
			setResult(null);
		};
		const qResult = (d: GameSong) => {
			setMode('answer');
			const win = d.winners.find(winner => winner.login === context.globalState.auth.data.username);
			setAwardedPoints(win?.awardedPoints);
			setAwardedPointsDetailed(win?.awardedPointsDetailed);
			setResult(d);
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
		if (result == null) {
			return 'white';
		}
		const maxPoints = Math.max(...result?.winners.map(score => score.awardedPoints));
		const points = result?.winners?.find(score => score.login === username)?.awardedPoints;
		if (!points) {
			return 'grey';
		} else if (points === maxPoints) {
			return 'lime';
		}
		return 'goldenrod';
	};

	useEffect(() => {
		setProgressColor(resultColor(context.globalState.auth.data.username));
	}, [result]);

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

	useEffect(() => {
		setDisabled(mode !== 'guess');
		setFocus(mode === 'guess');
	}, [mode]);

	const sendAnswer = useCallback(async (ans: string, setState = true) => {
		setAnswer(ans);
		if (ans.length && (!answerConfirmed.current || setState)) {
			if (setState) answerConfirmed.current = true;

			commandBackend('setAnswer', { answer: ans }).then(mode => {
				setResponseMode(mode);
				if (mode !== 'TOO_LATE') setAnswerSnapshot(ans);
			});
		}
	}, []);

	const debouncedSendAnswer = useCallback(debounce(sendAnswer, 150, { leading: false, trailing: true }), []);

	const debouncedSearchForSuggestions = useCallback(
		debounce(
			async (input: string) => {
				const answers: GamePossibleAnswer[] = await commandBackend('getPossibleAnswers', { answer: input });
				setSuggestions(
					uniqBy(
						answers.slice(0, 50).map<AutocompleteOption>(t => ({
							label:
								getTitleInLocale(context.globalState.settings.data, t.i18n, t.default_language) ||
								t.default_name,
							value:
								getTitleInLocale(context.globalState.settings.data, t.i18n, t.default_language) ||
								t.default_name,
							// t.ktid, // - using this won't handle the case of the people with the same names
						})),
						'value'
					)
				);
			},
			250,
			{ leading: true, trailing: true, maxWait: 1000 }
		),
		[]
	);

	const debouncedSearch = useCallback((input: string) => {
		setAnswer(input);
		debouncedSendAnswer(input, false);
		debouncedSearchForSuggestions(input);
	}, []);

	const quitQuiz = e => {
		e.preventDefault();
		navigate('/public');
	};

	return (
		<>
			<div className="player-box quiz">
				<div className="first">
					<p>{i18next.t('QUIZ.TITLE')}</p>
				</div>
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
					<h4 className="series">
						{mode === 'answer' ? (
							<>
								{awardedPoints > 0 ? (
									<>
										<i
											className={
												awardedPointsDetailed?.quickPoints > 0
													? 'fas fa-fw fa-bolt'
													: 'fas fa-fw fa-award'
											}
										></i>{' '}
										{i18next.t(
											awardedPointsDetailed?.quickPoints > 0
												? 'QUIZ.STATES.NICE_ONE_QUICK'
												: 'QUIZ.STATES.NICE_ONE',
											{
												points: awardedPoints,
											}
										)}
									</>
								) : (
									<>
										<i className="fas fa-fw fa-ban"></i>{' '}
										{i18next.t('QUIZ.STATES.SORRY', { answer: answerSnapshot })}
									</>
								)}
							</>
						) : (
							<>
								{['OK', 'OK_QUICK'].includes(responseMode) ? (
									<>
										<i
											className={
												responseMode === 'OK_QUICK'
													? 'fas fa-fw fa-person-running'
													: 'fas fa-fw fa-check'
											}
										></i>{' '}
										{i18next.t('QUIZ.STATES.REGISTERED', { answer: answerSnapshot })}
									</>
								) : null}
								{responseMode === 'TOO_LATE' ? (
									<>
										<i className="fas fa-fw fa-clock-four"></i>{' '}
										{i18next.t('QUIZ.STATES.TOO_LATE', { answer: answerSnapshot })}
									</>
								) : null}
								{responseMode === null ? (
									<>
										<i className="fas fa-fw fa-times"></i> {i18next.t('QUIZ.STATES.NO_ANSWER')}
									</>
								) : null}
							</>
						)}
					</h4>
				</div>
				{quiz.running ? (
					<div>
						<div className="progress-bar-container" ref={progressBarRef}>
							<div
								className="progress-bar"
								style={{ width: progressWidth, backgroundColor: progressColor }}
							/>
						</div>
						<AutocompleteQuiz
							value={answer}
							focus={focus}
							provideLabels={false}
							onChange={sendAnswer}
							acceptNewValues={true}
							options={suggestions}
							disabled={disabled}
							onType={debouncedSearch}
							changeFocus={setFocus}
							placeholder={i18next.t('QUIZ.PLACEHOLDER')}
							inputProps={{
								style: {
									borderTop: 'none',
									borderColor: progressColor,
									borderWidth: '0.15rem',
									fontSize: '1.1rem',
									transition: 'border-color ease 0.5s',
									outline: 'none',
								},
							}}
						/>
					</div>
				) : (
					<>
						<div>
							<i className="fas fa-fw fa-hourglass-end"></i> {i18next.t('QUIZ.END')}
						</div>
						<a className="action" href="/public" onClick={quitQuiz}>
							{i18next.t('QUIZ.QUIT')}
						</a>
					</>
				)}
			</div>
			<div id="nav-userlist" className="modal-body">
				<div className="userlist list-group">
					{userTotalScores?.map(userTotalScore => {
						const points = result?.winners?.find(s => s.login === userTotalScore.login);
						const answer = result?.answers?.find(a => a.login === userTotalScore.login);
						return (
							<li
								key={userTotalScore.login}
								className="list-group-item"
								style={{ borderLeft: '6px solid ' + resultColor(userTotalScore.login) }}
							>
								<div
									className="userLine"
									style={{
										display: 'flex',
										flexWrap: 'wrap',
										justifyContent: 'space-between',
										height: '100%',
									}}
								>
									<div style={{ display: 'flex', alignItems: 'center' }}>
										<ProfilePicture user={userTotalScore} className="img-circle avatar" />
										<span className="nickname">{userTotalScore.nickname}</span>
									</div>
									<div
										style={{
											flexGrow: 1,
											textAlign: 'center',
											paddingLeft: '1em',
											paddingRight: '1em',
										}}
									>
										{answer?.answer}
									</div>
									<div
										style={{
											lineHeight: 'normal',
											textAlign: 'right',
											marginLeft: 'auto',
										}}
									>
										<div>
											<span style={{ fontSize: 20 }}>{userTotalScore.total || 0}</span>
											{points && points.awardedPoints > 0 ? (
												<span>{' +' + points.awardedPoints}</span>
											) : null}
										</div>
										<div>
											{points?.awardedPoints > 0 ? '(' : null}
											{points?.awardedPointsDetailed.typePoints ? (
												<span>
													{' '}
													<i
														className={`fas fa-${acceptedAnswerToIcon(
															points.awardedPointsDetailed.type
														)} fa-sm`}
													></i>{' '}
													{points?.awardedPointsDetailed.typePoints}
												</span>
											) : null}
											{points?.awardedPointsDetailed.quickPoints ? (
												<span>
													{' '}
													<i className={`fas fa-bolt fa-sm`}></i>{' '}
													{points?.awardedPointsDetailed.quickPoints}
												</span>
											) : null}
											{points?.awardedPoints > 0 ? ')' : null}
										</div>
									</div>
								</div>
							</li>
						);
					})}
				</div>
			</div>
			{result ? (
				<KaraList karas={{ content: [result.song], infos: { count: 1, from: 0, to: 1 } }} scope="public" />
			) : null}
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
