import i18next from 'i18next';
import { merge } from 'lodash';
import { ChangeEvent, MouseEvent, useContext, useState } from 'react';
import { useAsyncMemo } from 'use-async-memo';
import type { QuizGameConfig } from '../../../../../src/types/config';
import type { User } from '../../../../../src/lib/types/user';
import type { BlindMode } from '../../../../../src/types/player';
import type { Game, GameTotalScore } from '../../../../../src/types/quiz';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';
import { displayMessage } from '../../../utils/tools';
import SelectWithIcon from '../generic/SelectWithIcon';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import './QuizModal.scss';

type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends (infer U)[]
		? RecursivePartial<U>[]
		: // eslint-disable-next-line @typescript-eslint/ban-types
		  T[P] extends object
		  ? RecursivePartial<T[P]>
		  : T[P];
};

interface IProps {
	gamePlaylist?: string;
}

interface GameUserTotalScore extends GameTotalScore {
	nickname: string;
}

export default function QuizModal(props: IProps) {
	const context = useContext(GlobalContext);

	const [version, setVersion] = useState(0);

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const onClickOutsideModal = (e: MouseEvent) => {
		const el = document.getElementsByClassName('modal-dialog')[0];
		if (!el.contains(e.target as Node)) {
			closeModalWithContext();
		}
	};

	const getPlaylistIcon = (playlist: PlaylistElem) => {
		// public & current playlist :  play-circle & globe icons
		if (playlist?.flag_public && playlist?.flag_current) return ['fa-play-circle', 'fa-globe'];
		// public playlist : globe icon
		if (playlist?.flag_public) return ['fa-globe'];
		// current playlist : play-circle icon
		if (playlist?.flag_current) return ['fa-play-circle'];
		// blacklist : ban icon
		if (playlist?.plaid === context.globalState.settings.data.state.blacklistPlaid) return ['fa-ban'];
		// whitelist : check-circle icon
		if (playlist?.plaid === context.globalState.settings.data.state.whitelistPlaid) return ['fa-check-circle'];
		// others playlist : list-ol icon
		return ['fa-list-ol'];
	};

	const playlists = useAsyncMemo<PlaylistElem[]>(
		async () => {
			return await commandBackend('getPlaylists');
		},
		[],
		[]
	);

	const existingGames = useAsyncMemo<Game[]>(
		async () => {
			return await commandBackend('getGames');
		},
		[version],
		[]
	);

	// Settings store
	const [gameName, setGameName] = useState('');
	const [gamePlaylist, setGamePlaylist] = useState<string | null>(props.gamePlaylist);
	const [gameConfig, rawSetGameConfig] = useState<QuizGameConfig>(
		merge({}, context.globalState.settings.data.state.quiz.settings, { Playlist: null })
	);
	const [gameLoaded, setGameLoaded] = useState('');
	const [gameEdition, setGameEdition] = useState(true);
	const [gameLoadedResults, setGameLoadedResults] = useState<GameUserTotalScore[]>([]);
	const gameLoadedData = gameLoaded ? existingGames.find(e => e.gamename === gameLoaded) : null;

	const setGameConfig = (changes: RecursivePartial<QuizGameConfig>) => {
		rawSetGameConfig(g => {
			return merge({}, g, changes);
		});
	};

	const getUserTotalScores = async (gamename: string) => {
		const [users, scores]: [User[], GameTotalScore[]] = await Promise.all([
			commandBackend('getUsers'),
			commandBackend('getTotalGameScore', {
				gamename,
			}),
		]);
		const scoresToDisplay = scores
			.map(score => ({ ...score, nickname: users.find(u => u.login === score.login)?.nickname }))
			.filter(score => score.nickname != null);
		return scores ? scoresToDisplay : [];
	};

	const loadGameConfig = async (e: ChangeEvent<HTMLSelectElement>) => {
		setGameLoaded(e.target.value);
		if (e.target.value === '') {
			rawSetGameConfig(context.globalState.settings.data.state.quiz.settings);
			setGamePlaylist(props.gamePlaylist);
			setGameName('');
			setGameEdition(true);
			setGameLoadedResults([]);
		} else {
			const existingGame = existingGames.find(g => g.gamename === e.target.value);
			const settings = existingGame.settings;
			const playlist = existingGame.state.playlist;
			if (playlists.map(p => p.plaid).includes(playlist)) {
				setGamePlaylist(playlist);
			} else {
				setGamePlaylist(null);
			}
			setGameConfig(settings);
			setGameName(e.target.value);
			setGameEdition(false);
			setGameLoadedResults(await getUserTotalScores(e.target.value));
		}
	};

	const [blindModeChecked, setBlindMode] = useState(true);

	const [showAllTagTypes, setShowAllTagTypes] = useState(false);

	const copyGame = async () => {
		setGameName(gn => i18next.t('MODAL.START_QUIZ.COPIED_GAME', { gameName: gn }));
		setGameLoaded('');
		setGameEdition(true);
		setGameLoadedResults([]);
	};

	const editGame = async () => {
		setGameEdition(!gameEdition);
		// cancel edition
		const existingGame = existingGames.find(g => g.gamename === gameLoaded);
		setGameConfig(existingGame.settings);
	};

	const startGame = async (settings?: QuizGameConfig) => {
		if (!gamePlaylist) {
			displayMessage('warning', i18next.t('MODAL.START_QUIZ.EMPTY_PLAYLIST'));
			document.getElementById('quiz-modal').scrollTo({
				top: 0,
				behavior: 'smooth',
			});
			return;
		}
		if (settings != null) {
			for (const answer of Object.values(settings.Answers.Accepted)) {
				if (answer.Enabled && answer.Points == null) {
					answer.Points = 1;
				}
			}
		}
		try {
			await commandBackend('startGame', {
				gamename: gameName,
				playlist: gamePlaylist,
				settings,
			});
			closeModalWithContext();
		} catch (e) {
			// already display
		}
	};

	const continueGame = async () => {
		await startGame(gameEdition ? gameConfig : null);
	};

	const createGame = async () => {
		if (gameName === '') {
			displayMessage('warning', i18next.t('MODAL.START_QUIZ.EMPTY_NAME'));
			document.getElementById('quiz-modal').scrollTo({
				top: 0,
				behavior: 'smooth',
			});
			return;
		}
		await startGame(gameConfig);
	};

	const deleteGame = async () => {
		await commandBackend('deleteGame', { gamename: gameName });
		setVersion(v => v + 1);
		rawSetGameConfig(context.globalState.settings.data.state.quiz.settings);
		setGameName('');
		setGameLoadedResults([]);
		setGameLoaded('');
		setGameEdition(true);
	};

	const resetScores = async () => {
		await commandBackend('resetGameScores', { gamename: gameName });
		setVersion(v => v + 1);
		setGameLoadedResults(await commandBackend('getTotalGameScore', { gamename: gameName }));
		displayMessage('success', 'Scores supprimés !');
	};

	return (
		<div className="modal modalPage" onClick={onClickOutsideModal} id="quiz-modal">
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h2 className="modal-title">{i18next.t('MODAL.START_QUIZ.TITLE')}</h2>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times"></i>
						</button>
					</ul>
					<div className="modal-body">
						<p>{i18next.t('MODAL.START_QUIZ.DESCRIPTION')}</p>
						<div className="filterContainer grow-labels">
							<label className="filterLabel" htmlFor="quiz-load-config">
								{i18next.t('MODAL.START_QUIZ.LOAD_GAME')}
							</label>
							<select
								id="quiz-load-config"
								onChange={loadGameConfig}
								value={gameLoaded}
								disabled={existingGames.length === 0}
							>
								<option value="">{i18next.t('MODAL.START_QUIZ.NEW_GAME')}</option>
								{existingGames.map(e => (
									<option value={e.gamename} key={e.gamename}>
										{e.flag_active
											? i18next.t('MODAL.START_QUIZ.LAST_PLAYED_GAME', { gameName: e.gamename })
											: e.gamename}
									</option>
								))}
							</select>
						</div>
						<div className="filterContainer grow-labels">
							<label className="filterLabel" htmlFor="quiz-game-name">
								{i18next.t('MODAL.START_QUIZ.GAME_NAME')}
							</label>
							<input
								className="filterInput"
								data-exclude={true}
								type="text"
								id="quiz-game-name"
								value={gameName}
								disabled={gameLoaded !== ''}
								onChange={e => setGameName(e.target.value)}
								placeholder={i18next.t('MODAL.START_QUIZ.GAME_NAME_PLACEHOLDER')}
							/>
						</div>
						<div className="filterContainer grow-labels">
							<label className="filterLabel" htmlFor="quiz-player-message">
								{i18next.t('MODAL.START_QUIZ.PLAYER_MESSAGE')}
							</label>
							<input
								className="filterInput"
								data-exclude={true}
								type="text"
								id="quiz-player-message"
								value={
									gameConfig.PlayerMessage !== undefined
										? gameConfig.PlayerMessage
										: i18next.t('MODAL.START_QUIZ.PLAYER_MESSAGE_PLACEHOLDER')
								}
								onChange={e => setGameConfig({ PlayerMessage: e.target.value })}
								disabled={!gameEdition}
							/>
						</div>
						<div className="filterContainer grow-labels">
							<label className="filterLabel" htmlFor="quiz-game-name">
								{i18next.t('MODAL.START_QUIZ.PLAYLIST')}
							</label>
							<SelectWithIcon
								list={playlists.map(p => ({
									label: p.name,
									value: p.plaid,
									icons: getPlaylistIcon(p),
								}))}
								value={gamePlaylist}
								onChange={v => setGamePlaylist(v)}
							/>
						</div>
						{gameLoaded ? (
							<>
								<p>
									{i18next.t('MODAL.START_QUIZ.GAME_IN_PROGRESS.SONG_COUNT', {
										count:
											'currentSong' in gameLoadedData.state
												? gameLoadedData.state.currentSongNumber
												: 0,
									})}
									<br />
									{gameLoadedResults.length > 0
										? i18next.t('MODAL.START_QUIZ.GAME_IN_PROGRESS.SCORES')
										: null}
									{gameLoadedResults.map(user => {
										return (
											<div className="userLine" key={user.login}>
												<div className="userNickname">
													<ProfilePicture user={user} className="img-circle avatar" />
													<span className="nickname">{user.nickname}</span>
												</div>
												<div className="userPoints">
													<span>
														{i18next.t('QUIZ.POINTS', {
															count: user.total,
														})}
													</span>
												</div>
											</div>
										);
									})}
								</p>
							</>
						) : (
							''
						)}
						{gameEdition ? (
							<>
								<h3>{i18next.t('MODAL.START_QUIZ.END_GAME.TITLE')}</h3>
								<p>{i18next.t('MODAL.START_QUIZ.END_GAME.DESCRIPTION')}</p>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-max-score-enabled"
											checked={gameConfig.EndGame.MaxScore.Enabled}
											onChange={e =>
												setGameConfig({ EndGame: { MaxScore: { Enabled: e.target.checked } } })
											}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-max-score-enabled">
										{i18next.t('MODAL.START_QUIZ.END_GAME.MAX_SCORE')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="number"
										min="1"
										id="quiz-max-score-points"
										value={gameConfig.EndGame.MaxScore.Score}
										onChange={e =>
											setGameConfig({ EndGame: { MaxScore: { Score: Number(e.target.value) } } })
										}
										disabled={!gameConfig.EndGame.MaxScore.Enabled}
										placeholder={i18next.t('MODAL.START_QUIZ.END_GAME.MAX_SCORE_PLACEHOLDER')}
									/>
									<label className="filterLabel" htmlFor="quiz-max-score-points">
										{i18next.t('MODAL.START_QUIZ.END_GAME.POINTS')}
									</label>
								</div>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-max-songs-enabled"
											checked={gameConfig.EndGame.MaxSongs.Enabled}
											onChange={e =>
												setGameConfig({ EndGame: { MaxSongs: { Enabled: e.target.checked } } })
											}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-max-songs-enabled">
										{i18next.t('MODAL.START_QUIZ.END_GAME.MAX_SONGS')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="number"
										min="1"
										id="quiz-max-songs-songs"
										value={gameConfig.EndGame.MaxSongs.Songs}
										onChange={e =>
											setGameConfig({ EndGame: { MaxSongs: { Songs: Number(e.target.value) } } })
										}
										disabled={!gameConfig.EndGame.MaxSongs.Enabled}
										placeholder={i18next.t('MODAL.START_QUIZ.END_GAME.MAX_SONGS_PLACEHOLDER')}
									/>
									<label className="filterLabel" htmlFor="quiz-max-score-songs">
										{i18next.t('MODAL.START_QUIZ.END_GAME.SONGS')}
									</label>
								</div>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-duration-enabled"
											checked={gameConfig.EndGame.Duration.Enabled}
											onChange={e =>
												setGameConfig({ EndGame: { Duration: { Enabled: e.target.checked } } })
											}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-duration-enabled">
										{i18next.t('MODAL.START_QUIZ.END_GAME.DURATION')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="number"
										min="1"
										id="quiz-duration-minutes"
										value={gameConfig.EndGame.Duration.Minutes}
										onChange={e =>
											setGameConfig({
												EndGame: { Duration: { Minutes: Number(e.target.value) } },
											})
										}
										disabled={!gameConfig.EndGame.Duration.Enabled}
										placeholder={i18next.t('MODAL.START_QUIZ.END_GAME.DURATION_PLACEHOLDER')}
									/>
									<label className="filterLabel" htmlFor="quiz-duration-minutes">
										{i18next.t('MODAL.START_QUIZ.END_GAME.MINUTES')}
									</label>
								</div>
								<h3>{i18next.t('MODAL.START_QUIZ.PLAYERS.TITLE')}</h3>
								<p>{i18next.t('MODAL.START_QUIZ.PLAYERS.DESCRIPTION')}</p>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-allow-guests"
											checked={gameConfig.Players.Guests}
											onChange={e => setGameConfig({ Players: { Guests: e.target.checked } })}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-allow-guests">
										{i18next.t('MODAL.START_QUIZ.PLAYERS.ALLOW_GUESTS')}
									</label>
								</div>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-twitch-enabled"
											disabled={
												!context.globalState.settings.data.config.Karaoke.StreamerMode.Twitch
													.Enabled
											}
											checked={gameConfig.Players.Twitch}
											onChange={e => setGameConfig({ Players: { Twitch: e.target.checked } })}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-twitch-enabled">
										{i18next.t('MODAL.START_QUIZ.PLAYERS.TWITCH_CHAT')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="text"
										value={gameConfig.Players.TwitchPlayerName}
										onChange={e => setGameConfig({ Players: { TwitchPlayerName: e.target.value } })}
										disabled={!gameConfig.Players.Twitch}
										placeholder={i18next.t('MODAL.START_QUIZ.PLAYERS.TWITCH_CHAT_PLACEHOLDER')}
									/>
								</div>
								<h3>{i18next.t('MODAL.START_QUIZ.DISPLAY.TITLE')}</h3>
								<p>{i18next.t('MODAL.START_QUIZ.DISPLAY.DESCRIPTION')}</p>
								<div className="filterContainer">
									<label className="filterLabel" htmlFor="quiz-start-time">
										{i18next.t('MODAL.START_QUIZ.DISPLAY.TIME')} (
										{gameConfig.TimeSettings.WhenToStartSong}&nbsp;%)
									</label>
									<label className="filterLabel no-rborder">
										{i18next.t('MODAL.START_QUIZ.DISPLAY.BEGINNING')}
									</label>
									<div className="filterLabel range">
										<input
											className="filterInput"
											type="range"
											id="quiz-start-time"
											min="0"
											max="100"
											value={gameConfig.TimeSettings.WhenToStartSong}
											onChange={e =>
												setGameConfig({
													TimeSettings: { WhenToStartSong: e.target.valueAsNumber },
												})
											}
										/>
									</div>
									<label className="filterLabel">{i18next.t('MODAL.START_QUIZ.DISPLAY.END')}</label>
								</div>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-hide-video"
											checked={blindModeChecked}
											onChange={e => setBlindMode(e.target.checked)}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-hide-video">
										{i18next.t('MODAL.START_QUIZ.DISPLAY.BLIND')}
									</label>
									<select
										id="quiz-blind-mode"
										onChange={e =>
											setGameConfig({ Modifiers: { Blind: e.target.value as BlindMode } })
										}
										value={gameConfig.Modifiers.Blind}
										disabled={!blindModeChecked}
									>
										<option value="black">
											{i18next.t('MODAL.START_QUIZ.DISPLAY.BLACK_SCREEN')}
										</option>
										<option value="blur">
											{i18next.t('MODAL.START_QUIZ.DISPLAY.BLURRED_SCREEN')}
										</option>
									</select>
								</div>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-mute-video"
											checked={gameConfig.Modifiers.Mute}
											onChange={e => setGameConfig({ Modifiers: { Mute: e.target.checked } })}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-mute-video">
										{i18next.t('MODAL.START_QUIZ.DISPLAY.MUTE')}
									</label>
								</div>
								<div className="filterContainer grow-labels">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-hide-subtitles"
											checked={gameConfig.Modifiers.NoLyrics}
											onChange={e => setGameConfig({ Modifiers: { NoLyrics: e.target.checked } })}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-hide-subtitles">
										{i18next.t('MODAL.START_QUIZ.DISPLAY.NO_LYRICS')}
									</label>
								</div>
								<h3>{i18next.t('MODAL.START_QUIZ.ANSWERS.TITLE')}</h3>
								<p>{i18next.t('MODAL.START_QUIZ.ANSWERS.DESCRIPTION')}</p>
								<button
									onClick={() => setShowAllTagTypes(satt => !satt)}
									className="btn btn-default answers-button"
								>
									{i18next.t(
										showAllTagTypes
											? 'MODAL.START_QUIZ.ANSWERS.VIEW_LESS_ANSWERS'
											: 'MODAL.START_QUIZ.ANSWERS.VIEW_ALL_ANSWERS'
									)}
								</button>
								<div className="answers-grid">
									<div className={`filterContainer grow-labels`}>
										<div className="filterCheckbox">
											<input
												type="checkbox"
												id={`quiz-accept-title`}
												checked={gameConfig.Answers.Accepted.title?.Enabled}
												onChange={e =>
													setGameConfig({
														Answers: {
															Accepted: {
																title: {
																	Enabled: e.target.checked,
																},
															},
														},
													})
												}
											/>
										</div>
										<label className="filterLabel" htmlFor="quiz-accept-title">
											<i className="fas fa-fw fa-music" />{' '}
											{i18next.t(`MODAL.START_QUIZ.ANSWERS.ANSWER_TITLE`)}
										</label>
										<input
											className="filterInput"
											data-exclude={true}
											type="number"
											min="1"
											id="quiz-answer-title-points"
											disabled={!gameConfig.Answers.Accepted.title?.Enabled}
											value={gameConfig.Answers.Accepted.title?.Points ?? 1}
											onChange={e =>
												setGameConfig({
													Answers: {
														Accepted: { title: { Points: e.target.valueAsNumber } },
													},
												})
											}
										/>
									</div>
									{Object.entries(tagTypes).map(([key, obj]) => {
										if (
											![
												'SONGTYPES',
												'SINGERS',
												'SINGERGROUPS',
												'SERIES',
												'LANGS',
												'SONGWRITERS',
												'CREATORS',
												'FRANCHISES',
											].includes(key) &&
											!showAllTagTypes
										)
											return null;
										return (
											<div className={`filterContainer grow-labels`} key={key}>
												<div className="filterCheckbox">
													<input
														type="checkbox"
														id={`quiz-accept-${obj.karajson}`}
														checked={gameConfig.Answers.Accepted[obj.karajson]?.Enabled}
														onChange={e => {
															const o = {};
															o[obj.karajson] = { Enabled: e.target.checked };
															setGameConfig({
																Answers: {
																	Accepted: o,
																},
															});
														}}
													/>
												</div>
												<label className="filterLabel" htmlFor={`quiz-accept-${obj.karajson}`}>
													<i className={`fas fa-fw fa-${obj.icon}`} />{' '}
													{i18next.t(`TAG_TYPES.${key}_other`)}
												</label>
												<input
													className="filterInput"
													data-exclude={true}
													type="number"
													min="1"
													id={`quiz-answer-${obj.karajson}-points`}
													disabled={!gameConfig.Answers.Accepted[obj.karajson]?.Enabled}
													value={gameConfig.Answers.Accepted[obj.karajson]?.Points ?? 1}
													onChange={e => {
														const o = {};
														o[obj.karajson] = { Points: e.target.valueAsNumber };
														setGameConfig({
															Answers: {
																Accepted: o,
															},
														});
													}}
												/>
											</div>
										);
									})}
									<div className={`filterContainer grow-labels`}>
										<div className="filterCheckbox">
											<input
												type="checkbox"
												id={`quiz-accept-year`}
												checked={gameConfig.Answers.Accepted.year?.Enabled}
												onChange={e =>
													setGameConfig({
														Answers: {
															Accepted: {
																year: {
																	Enabled: e.target.checked,
																},
															},
														},
													})
												}
											/>
										</div>
										<label className="filterLabel" htmlFor="quiz-accept-year">
											<i className="fas fa-fw fa-calendar-days" /> {i18next.t(`KARA.YEAR`)}
										</label>
										<input
											className="filterInput"
											data-exclude={true}
											type="number"
											min="1"
											id="quiz-answer-year-points"
											disabled={!gameConfig.Answers.Accepted.year?.Enabled}
											value={gameConfig.Answers.Accepted.year?.Points ?? 1}
											onChange={e =>
												setGameConfig({
													Answers: { Accepted: { year: { Points: e.target.valueAsNumber } } },
												})
											}
										/>
									</div>
								</div>
								<div className="filterContainer">
									<label className="filterLabel" htmlFor="quiz-similarity-percentage">
										{i18next.t('MODAL.START_QUIZ.ANSWERS.TOLERANCE')} (
										{100 - gameConfig.Answers.SimilarityPercentageNeeded}&nbsp;%)
									</label>
									<label className="filterLabel no-rborder">
										{i18next.t('MODAL.START_QUIZ.ANSWERS.LAX')}
									</label>
									<div className="filterLabel range">
										<input
											className="filterInput"
											type="range"
											id="quiz-similarity-percentage"
											min="10"
											max="100"
											value={gameConfig.Answers.SimilarityPercentageNeeded}
											onChange={e =>
												setGameConfig({
													Answers: { SimilarityPercentageNeeded: e.target.valueAsNumber },
												})
											}
										/>
									</div>
									<label className="filterLabel">
										{i18next.t('MODAL.START_QUIZ.ANSWERS.PERFECT')}
									</label>
								</div>
								<h3>{i18next.t('MODAL.START_QUIZ.TIME.TITLE')}</h3>
								<p>{i18next.t('MODAL.START_QUIZ.TIME.DESCRIPTION')}</p>
								<div className="filterContainer grow-labels big">
									<label className="filterLabel" htmlFor="quiz-answer-time">
										{i18next.t('MODAL.START_QUIZ.TIME.GUESS_DURATION')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="number"
										min="1"
										id="quiz-answer-time"
										value={gameConfig.TimeSettings.GuessingTime}
										onChange={e =>
											setGameConfig({ TimeSettings: { GuessingTime: e.target.valueAsNumber } })
										}
									/>
								</div>
								<div className="filterContainer grow-labels big">
									<label className="filterLabel" htmlFor="quiz-reveal-time">
										{i18next.t('MODAL.START_QUIZ.TIME.ANSWER_DURATION')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="number"
										min="1"
										id="quiz-reveal-time"
										value={gameConfig.TimeSettings.AnswerTime}
										onChange={e =>
											setGameConfig({ TimeSettings: { AnswerTime: e.target.valueAsNumber } })
										}
									/>
								</div>
								<div className="filterContainer grow-labels big">
									<div className="filterCheckbox">
										<input
											type="checkbox"
											id="quiz-quick-answer-time"
											checked={gameConfig.Answers.QuickAnswer.Enabled}
											onChange={e =>
												setGameConfig({
													Answers: { QuickAnswer: { Enabled: e.target.checked } },
												})
											}
										/>
									</div>
									<label className="filterLabel" htmlFor="quiz-quick-answer-time">
										{i18next.t('MODAL.START_QUIZ.TIME.QUICK_GUESS_DURATION')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="number"
										min="0"
										max={gameConfig.TimeSettings.GuessingTime}
										value={gameConfig.TimeSettings.QuickGuessingTime}
										onChange={e =>
											setGameConfig({
												TimeSettings: { QuickGuessingTime: e.target.valueAsNumber },
											})
										}
										disabled={!gameConfig.Answers.QuickAnswer.Enabled}
										placeholder={'1'}
									/>
								</div>
								<div className="filterContainer grow-labels big">
									<label className="filterLabel" htmlFor="quiz-quick-answer-points">
										{i18next.t('MODAL.START_QUIZ.TIME.QUICK_AWARD_POINTS')}
									</label>
									<input
										className="filterInput"
										data-exclude={true}
										type="number"
										min="1"
										id="quiz-quick-answer-points"
										value={gameConfig.Answers.QuickAnswer.Points}
										disabled={!gameConfig.Answers.QuickAnswer.Enabled}
										onChange={e =>
											setGameConfig({
												Answers: { QuickAnswer: { Points: e.target.valueAsNumber } },
											})
										}
									/>
								</div>
							</>
						) : (
							''
						)}
					</div>
					{gameLoaded ? (
						<div className="btn-group fluid">
							<button className="btn btn-default" onClick={editGame}>
								<i className="fas fa-fw fa-pencil" />{' '}
								{gameEdition
									? i18next.t('MODAL.START_QUIZ.BUTTONS.CANCEL_EDIT')
									: i18next.t('MODAL.START_QUIZ.BUTTONS.EDIT')}
							</button>
							<button className="btn btn-success" onClick={copyGame}>
								<i className="fas fa-fw fa-copy" /> {i18next.t('MODAL.START_QUIZ.BUTTONS.COPY')}
							</button>
							<button className="btn btn-danger-low" onClick={resetScores}>
								<i className="fas fa-fw fa-person-circle-minus" />{' '}
								{i18next.t('MODAL.START_QUIZ.BUTTONS.DELETE_SCORES')}
							</button>
							<button className="btn btn-danger" onClick={deleteGame}>
								<i className="fas fa-fw fa-trash" /> {i18next.t('MODAL.START_QUIZ.BUTTONS.DELETE')}
							</button>
							<button className="btn btn-primary" onClick={continueGame}>
								{gamePlaylist == null ? (
									<>
										<i className="fas fa-fw fa-warning" />{' '}
										{i18next.t('MODAL.START_QUIZ.EMPTY_PLAYLIST')}
									</>
								) : (
									<>
										<i className="fas fa-fw fa-play-circle" />{' '}
										{i18next.t('MODAL.START_QUIZ.BUTTONS.RESUME')}
									</>
								)}
							</button>
						</div>
					) : (
						<button className="btn btn-default confirm" onClick={createGame}>
							{gameName === '' ? (
								<>
									<i className="fas fa-fw fa-warning" /> {i18next.t('MODAL.START_QUIZ.EMPTY_NAME')}
								</>
							) : gamePlaylist == null ? (
								<>
									<i className="fas fa-fw fa-warning" />{' '}
									{i18next.t('MODAL.START_QUIZ.EMPTY_PLAYLIST')}
								</>
							) : (
								<>
									<i className="fas fa-fw fa-check" />{' '}
									{i18next.t('MODAL.START_QUIZ.BUTTONS.CREATE_START')}
								</>
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
