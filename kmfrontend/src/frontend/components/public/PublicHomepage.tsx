import './PublicHomepage.scss';

import i18next from 'i18next';
import { useContext, useState } from 'react';

import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import { is_touch_device, nonStandardPlaylists, secondsTimeSpanToHMS } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import { View } from '../../types/view';
import LyricsBox from './LyricsBox';
import PlayerBox from './PlayerBox';

interface IProps {
	changeView: (view: View, tagType?: number, searchValue?: string, searchCriteria?: 'year' | 'tag') => void;
	toggleKaraDetail: (kara: KaraElement, plaid: string, indexPlaylist: number) => void;
	activePoll: boolean;
	publicVisible: boolean;
	currentVisible: boolean;
	openPoll: () => void;
}

function PublicHomepage(props: IProps) {
	const context = useContext(GlobalContext);
	const [othersMenu, setOthersMenu] = useState(false);
	const [currentKid, setCurrentKid] = useState<string>();

	const getLucky = async () => {
		if (context.globalState.auth.isAuthenticated) {
			const response = await commandBackend('getKaras', {
				random: 1,
				blacklist: true,
			});
			if (response?.content && response.content[0]) {
				props.toggleKaraDetail(response.content[0], nonStandardPlaylists.library, 0);
			}
		}
	};

	return (
		<>
			<div className="hello-bar">
				<span>
					{`${i18next.t('PUBLIC_HOMEPAGE.HELLO')} ${context.globalState.settings.data.user.nickname}`}
					&nbsp;!
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
						show={true}
						currentVisible={props.currentVisible}
						goToCurrentPL={() => props.changeView('currentPlaylist')}
						onKaraChange={(kid) => setCurrentKid(kid)}
					/>
					{is_touch_device() ? <LyricsBox kid={currentKid} mobile /> : null}
					<div className="home-actions">
						{props.activePoll ? (
							<button className="action yellow big" onClick={() => props.openPoll()}>
								<i className="fas fa-fw fa-chart-line" /> {i18next.t('PUBLIC_HOMEPAGE.OPEN_POLL')}
							</button>
						) : null}
						{props.publicVisible &&
							context.globalState.settings.data.state.currentPlaid !==
							context.globalState.settings.data.state.publicPlaid ?
							(
								<button
									className="action green"
									onClick={() => props.changeView('publicPlaylist')}
								>
									<i className="fas fa-fw fa-tasks" />{' '}
									{i18next.t('PUBLIC_HOMEPAGE.PUBLIC_SUGGESTIONS')}
								</button>
							) : null}
						{context?.globalState.auth.data.role !== 'guest' ? (
							<button className="action yellow" onClick={() => props.changeView('favorites')}>
								<i className="fas fa-fw fa-star" /> {i18next.t('PUBLIC_HOMEPAGE.FAVORITES')}
							</button>
						) : null}
						{context?.globalState.settings.data.config?.Frontend?.Mode === 2 ? (
							<>
								<button className="action blue" onClick={() => props.changeView('search')}>
									<i className="fas fa-fw fa-search" /> {i18next.t('PUBLIC_HOMEPAGE.SONG_SEARCH')}
								</button>
								<button className="action green" onClick={getLucky}>
									<i className="fas fa-fw fa-dice" /> {i18next.t('PUBLIC_HOMEPAGE.GET_LUCKY')}
								</button>
								<button className="action purple" onClick={() => props.changeView('history')}>
									<i className="fas fa-fw fa-clock" /> {i18next.t('PUBLIC_HOMEPAGE.NEW_KARAOKES')}
								</button>
								<button
									className="action orange"
									onClick={() => props.changeView('requested')}
								>
									<i className="fas fa-fw fa-fire" />{' '}
									{i18next.t('PUBLIC_HOMEPAGE.REQUESTED_KARAOKES')}
								</button>
								<h3 className="subtitle">{i18next.t('PUBLIC_HOMEPAGE.EXPLORE')}</h3>
								{Object.keys(tagTypes).map((type) => {
									if ([1, 2, 4, 5].includes(tagTypes[type].type)) {
										return (
											<button
												className={`action ${tagTypes[type].color}`}
												onClick={() => props.changeView('tag', tagTypes[type].type)}
												key={`tag-${tagTypes[type].type}`}
											>
												<i className={`fas fa-fw fa-${tagTypes[type].icon}`} />{' '}
												{i18next.t(`TAG_TYPES.${type}_other`)}
											</button>
										);
									}
								})}
								<button className="action" onClick={() => props.changeView('tag', YEARS.type)}>
									<i className={`fas fa-fw fa-${YEARS.icon}`} /> {i18next.t('DETAILS.YEAR')}
								</button>
								<button
									className="action"
									onClick={() => setOthersMenu(!othersMenu)}
								>
									<i
										className={
											othersMenu
												? 'fa fa-fw fa-arrow-up'
												: 'fa fa-fw fa-arrow-down'
										}
									/>
									{i18next.t('PUBLIC_HOMEPAGE.OTHERS')}
								</button>
								{othersMenu ? (
									<>
										{Object.keys(tagTypes).map((type) => {
											if (![1, 2, 4, 5].includes(tagTypes[type].type)) {
												return (
													<button
														className={`action ${tagTypes[type].color}`}
														onClick={() =>
															props.changeView('tag', tagTypes[type].type)
														}
														key={`tag-${tagTypes[type].type}`}
													>
														<i className={`fas fa-fw fa-${tagTypes[type].icon}`} />{' '}
														{i18next.t(`TAG_TYPES.${type}_other`)}
													</button>
												);
											}
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
