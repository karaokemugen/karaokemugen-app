import './PublicHomepage.scss';

import i18next from 'i18next';
import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import { is_touch_device, secondsTimeSpanToHMS } from '../../../utils/tools';
import LyricsBox from './LyricsBox';
import PlayerBox from './PlayerBox';

interface IProps {
	activePoll: boolean;
	publicVisible: boolean;
	currentVisible: boolean;
	openPoll: () => void;
}

function PublicHomepage(props: IProps) {
	const navigate = useNavigate();
	const context = useContext(GlobalContext);
	const [othersMenu, setOthersMenu] = useState(false);
	const [currentKid, setCurrentKid] = useState<string>();
	const [diceAnimation, setDiceAnimation] = useState(false);

	const getLucky = async () => {
		if (context.globalState.auth.isAuthenticated) {
			setDiceAnimation(true);
			const response = await commandBackend('getKaras', {
				random: 1,
				blacklist: true,
			});
			setDiceAnimation(false);
			if (response?.content && response.content[0]) {
				navigate(`/public/karaoke/${response.content[0].kid}`);
			}
		}
	};

	return (
		<>
			<div className="hello-bar">
				<span>
					{i18next.t('PUBLIC_HOMEPAGE.HELLO', { name: context.globalState.settings.data.user.nickname })}
				</span>
				<div className="warning">
					{context?.globalState.settings.data.config?.Frontend?.Mode === 1
						? i18next.t('PUBLIC_HOMEPAGE.RESTRICTED_DESCRIPTION')
						: null}
				</div>
				<div>
					{context?.globalState.settings.data.config?.Frontend?.Mode === 2 &&
					context?.globalState.settings.data.config?.Karaoke?.Quota.Type === 1
						? i18next.t('PUBLIC_HOMEPAGE.QUOTA_KARA_DESCRIPTION', {
								count: context.globalState.settings.data.config?.Karaoke?.Quota?.Songs,
							})
						: null}
				</div>
				<div>
					{context?.globalState.settings.data.config?.Frontend?.Mode === 2 &&
					context?.globalState.settings.data.config?.Karaoke?.Quota.Type === 2
						? i18next.t('PUBLIC_HOMEPAGE.QUOTA_TIME_DESCRIPTION', {
								time: secondsTimeSpanToHMS(
									context.globalState.settings.data.config?.Karaoke?.Quota?.Time,
									'ms'
								),
							})
						: null}
				</div>
			</div>
			<div className="public-homepage">
				<div className="public-homepage-wrapper">
					<PlayerBox
						mode="homepage"
						currentVisible={props.currentVisible}
						onKaraChange={kid => setCurrentKid(kid)}
					/>
					{is_touch_device() ? <LyricsBox kid={currentKid} mobile /> : null}
					<div className="home-actions">
						{props.activePoll ? (
							<button className="action yellow big" onClick={() => props.openPoll()}>
								<i className="fas fa-fw fa-chart-line" /> {i18next.t('PUBLIC_HOMEPAGE.OPEN_POLL')}
							</button>
						) : null}
						{props.currentVisible ? (
							<Link className="action green" to="/public/playlist/current">
								<i className="fas fa-fw fa-play-circle" /> {i18next.t('PUBLIC_HOMEPAGE.CURRENT')}
							</Link>
						) : null}
						{props.publicVisible &&
						context.globalState.settings.data.state.currentPlaid !==
							context.globalState.settings.data.state.publicPlaid ? (
							<Link className="action orange" to="/public/playlist/public">
								<i className="fas fa-fw fa-tasks" /> {i18next.t('PUBLIC_HOMEPAGE.PUBLIC_SUGGESTIONS')}
							</Link>
						) : null}
						{context?.globalState.auth.data.role !== 'guest' ? (
							<Link className="action yellow" to="/public/favorites">
								<i className="fas fa-fw fa-star" /> {i18next.t('PUBLIC_HOMEPAGE.FAVORITES')}
							</Link>
						) : null}
						{context?.globalState.settings.data.config?.Frontend?.Mode !== 0 ? (
							<>
								<Link className="action blue" to="/public/search">
									<i className="fas fa-fw fa-search" /> {i18next.t('PUBLIC_HOMEPAGE.SONG_SEARCH')}
								</Link>
								<button className="action green" onClick={getLucky}>
									<i className={`fas fa-fw fa-dice${diceAnimation ? ' fa-beat' : ''}`} />{' '}
									{i18next.t('PUBLIC_HOMEPAGE.GET_LUCKY')}
								</button>
								<Link className="action purple" to="/public/search/recent">
									<i className="fas fa-fw fa-clock" /> {i18next.t('PUBLIC_HOMEPAGE.NEW_KARAOKES')}
								</Link>
								<Link className="action orange" to="/public/search/requested">
									<i className="fas fa-fw fa-fire" />{' '}
									{i18next.t('PUBLIC_HOMEPAGE.REQUESTED_KARAOKES')}
								</Link>
								{context?.globalState.settings.data.user.anime_list_to_fetch ? (
									<Link className="action yellow" to="/public/animelist">
										<i
											className={`icon-${context?.globalState.settings.data.user.anime_list_to_fetch}`}
										/>{' '}
										{i18next.t('PUBLIC_HOMEPAGE.ANIME_LIST')}
									</Link>
								) : null}
								<h3 className="subtitle">{i18next.t('PUBLIC_HOMEPAGE.EXPLORE')}</h3>
								{Object.keys(tagTypes).map(type => {
									if ([1, 2, 4, 5].includes(tagTypes[type].type)) {
										return (
											<Link
												className={`action ${tagTypes[type].color}`}
												to={`/public/tags/${tagTypes[type].type}`}
												key={`tag-${tagTypes[type].type}`}
											>
												<i className={`fas fa-fw fa-${tagTypes[type].icon}`} />{' '}
												{i18next.t(`TAG_TYPES.${type}_other`)}
											</Link>
										);
									}
									return undefined;
								})}
								<Link className="action" to={`/public/tags/${YEARS.type}`}>
									<i className={`fas fa-fw fa-${YEARS.icon}`} /> {i18next.t('DETAILS.YEAR')}
								</Link>
								<button className="action" onClick={() => setOthersMenu(!othersMenu)}>
									<i className={othersMenu ? 'fa fa-fw fa-arrow-up' : 'fa fa-fw fa-arrow-down'} />
									{i18next.t('PUBLIC_HOMEPAGE.OTHERS')}
								</button>
								{othersMenu ? (
									<>
										{Object.keys(tagTypes).map(type => {
											if (![1, 2, 4, 5, 16].includes(tagTypes[type].type)) {
												return (
													<Link
														className={`action ${tagTypes[type].color}`}
														to={`/public/tags/${tagTypes[type].type}`}
														key={`tag-${tagTypes[type].type}`}
													>
														<i className={`fas fa-fw fa-${tagTypes[type].icon}`} />{' '}
														{i18next.t(`TAG_TYPES.${type}_other`)}
													</Link>
												);
											}
											return undefined;
										})}
									</>
								) : null}
							</>
						) : null}
					</div>
				</div>
				<LyricsBox kid={currentKid} />
			</div>
		</>
	);
}

export default PublicHomepage;
