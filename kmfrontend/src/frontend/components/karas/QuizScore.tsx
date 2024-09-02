import './QuizScore.scss';

import i18next from 'i18next';
import { merge } from 'lodash';
import { useContext, useEffect, useState } from 'react';
import { useAsyncMemo } from 'use-async-memo';

import { User } from '../../../../../src/lib/types/user';
import { GameState, GameTotalScore } from '../../../../../src/types/quiz';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { commandBackend, getSocket } from '../../../utils/socket';
import { acceptedAnswerToIcon } from '../../../utils/tagTypes';

function QuizScore() {
	const context = useContext(GlobalContext);

	const [forceScore, setForceScore] = useState(false);

	const userTotalScores = useAsyncMemo(
		async () => {
			const [users, scores]: [User[], GameTotalScore[]] = await Promise.all([
				commandBackend('getUsers'),
				commandBackend('getTotalGameScore', {
					gamename: context.globalState.settings.data.state.quiz.currentQuizGame,
				}),
			]);
			const scoresToDisplay = scores
				.map(score => ({ ...score, nickname: users.find(u => u.login === score.login)?.nickname }))
				.filter(score => score.nickname != null);
			return scores ? scoresToDisplay : [];
		},
		[context.globalState.settings.data.state.quiz.currentQuizGame, forceScore],
		[]
	);

	useEffect(() => {
		const updateQuizState = (gameState: GameState) => {
			merge(context.globalState.settings.data.state.quiz, gameState);
		};

		const qResult = () => {
			setForceScore(!forceScore);
		};

		commandBackend('getGameState').then(gameState => {
			updateQuizState(gameState);
		});

		getSocket().on('quizStateUpdated', updateQuizState);
		getSocket().on('quizResult', qResult);
		return () => {
			getSocket().off('quizStateUpdated', updateQuizState);
			getSocket().off('quizResult', qResult);
		};
	}, []);

	const resultColor = (username: string) => {
		if (!context.globalState.settings.data.state.quiz.running) {
			const maxPoints = Math.max(...userTotalScores?.map(score => score.total));
			const points = userTotalScores?.find(score => score.login === username)?.total;
			return maxPoints === points ? 'gold' : 'grey';
		}
		if (context.globalState.settings.data.state.quiz.currentSong == null) {
			return 'white';
		}
		const maxPoints = Math.max(
			...context.globalState.settings.data.state.quiz.currentSong?.winners.map(score => score.awardedPoints)
		);
		const points = context.globalState.settings.data.state.quiz.currentSong?.winners?.find(
			score => score.login === username
		)?.awardedPoints;
		if (!points) {
			return 'grey';
		} else if (points === maxPoints) {
			return 'lime';
		}
		return 'goldenrod';
	};

	return context.globalState.settings.data.state.quiz.currentQuizGame ? (
		<div id="nav-userlist" className="modal-body">
			<div className="userlist list-group">
				{userTotalScores?.map(userTotalScore => {
					const points = context.globalState.settings.data.state.quiz.currentSong?.winners?.find(
						s => s.login === userTotalScore.login
					);
					const answer = context.globalState.settings.data.state.quiz.currentSong?.answers?.find(
						a => a.login === userTotalScore.login
					);
					return (
						<li
							key={userTotalScore.login}
							className="list-group-item"
							style={{ borderLeft: '6px solid ' + resultColor(userTotalScore.login) }}
						>
							<div className="userLine">
								<div className="userNickname">
									<ProfilePicture user={userTotalScore} className="img-circle avatar" />
									<span className="nickname">{userTotalScore.nickname}</span>
								</div>
								<div className="userAnswer">{answer?.answer}</div>
								<div className="userPoints">
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
	) : (
		<div className="player-box quiz">{i18next.t('QUIZ.NO_QUIZ')}</div>
	);
}

export default QuizScore;
