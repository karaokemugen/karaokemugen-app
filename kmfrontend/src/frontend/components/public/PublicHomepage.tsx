import './PublicHomepage.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import webappClose from '../../../assets/dame.jpg';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import { callModal, is_touch_device } from '../../../utils/tools';
import { View } from '../../types/view';
import LyricsBox from './LyricsBox';
import PlayerBox from './PlayerBox';

interface IProps {
	changeView: (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => void;
	activePoll: boolean;
	publicVisible: boolean;
	currentVisible: boolean;
	openPoll: () => void;
}

interface IState {
	othersMenu: boolean,
	currentKid?: string;
}

class PublicHomepage extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	state = {
		othersMenu: false,
		currentKid: null,
	}

	getLucky = async () => {
		if (this.context.globalState.auth.isAuthenticated) {
			const response = await commandBackend('getKaras', {
				random: 1
			});
			if (response?.content && response.content[0]) {
				const chosenOne = response.content[0].kid;
				const response2 = await commandBackend('getKara', {
					kid: chosenOne
				});
				callModal('confirm', i18next.t('CL_CONGRATS'), 
					i18next.t('CL_ABOUT_TO_ADD', {
						title: buildKaraTitle(this.context.globalState.settings.data, response2, true)
					}), () => {
						commandBackend('addKaraToPublicPlaylist', {
							requestedby: this.context.globalState.auth.data.username,
							kid: chosenOne
						});
					}, 'lucky');
			}
		}
	};

	render() {
		return (
			this.context?.globalState.settings.data.config?.Frontend?.Mode === 0 ?
				<div
					style={{
						top: '25%',
						position: 'relative',
						textAlign: 'center'
					}}
				>
					<img alt=''
						style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 150px)' }}
						src={webappClose}
					/>
					<div style={{ fontSize: '30px', padding: '10px' }}>
						{i18next.t('WEBAPPMODE_CLOSED_MESSAGE')}
					</div>
				</div> :
				<React.Fragment>
					<div className="hello-bar">
						<span>{`${i18next.t('PUBLIC_HOMEPAGE.HELLO')} ${this.context.globalState.settings.data.user.nickname}`}&nbsp;!</span>
						<div>{this.context?.globalState.settings.data.config?.Frontend?.Mode === 1 ? i18next.t('PUBLIC_HOMEPAGE.RESTRICTED_DESCRIPTION') : null}</div>
					</div>
					<div className="public-homepage">
						<div className="public-homepage-wrapper">
							<PlayerBox
								fixed={false}
								show={true}
								currentVisible={this.props.currentVisible}
								goToCurrentPL={() => this.props.changeView('currentPlaylist')}
								onKaraChange={kid => this.setState({ currentKid: kid })}
							/>
							{is_touch_device() ? <LyricsBox kid={this.state.currentKid} mobile /> : null}
							<div className="home-actions">
								{
									this.props.activePoll ?
										<button className="action yellow big" onClick={() => this.props.openPoll()}>
											<i className="fas fa-fw fa-chart-line" /> {i18next.t('PUBLIC_HOMEPAGE.OPEN_POLL')}
										</button> : null
								}
								{this.props.publicVisible ?
									<button className="action green" onClick={() => this.props.changeView('publicPlaylist')}>
										<i className="fas fa-fw fa-tasks" /> {i18next.t('PUBLIC_HOMEPAGE.PUBLIC_SUGGESTIONS')}
									</button> : null
								}
								{this.context?.globalState.auth.data.role !== 'guest' ?
									<button className="action yellow" onClick={() => this.props.changeView('favorites')}>
										<i className="fas fa-fw fa-star" /> {i18next.t('PUBLIC_HOMEPAGE.FAVORIS')}
									</button> : null
								}
								{this.context?.globalState.settings.data.config?.Frontend?.Mode === 2 ?
									<React.Fragment>
										<button className="action blue" onClick={() => this.props.changeView('search')}>
											<i className="fas fa-fw fa-search" /> {i18next.t('PUBLIC_HOMEPAGE.SONG_SEARCH')}
										</button>
										<button className="action green" onClick={this.getLucky}>
											<i className="fas fa-fw fa-dice" /> {i18next.t('PUBLIC_HOMEPAGE.GET_LUCKY')}
										</button>
										<button className="action purple" onClick={() => this.props.changeView('history')}>
											<i className="fas fa-fw fa-clock" /> {i18next.t('PUBLIC_HOMEPAGE.NEW_KARAOKES')}
										</button>
										<button className="action orange" onClick={() => this.props.changeView('requested')}>
											<i className="fas fa-fw fa-fire" /> {i18next.t('PUBLIC_HOMEPAGE.REQUESTED_KARAOKES')}
										</button>
										<h3 className="subtitle">
											{i18next.t('PUBLIC_HOMEPAGE.EXPLORE')}
										</h3>
										{Object.keys(tagTypes).map(type => {
											if ([1, 2, 4, 5].includes(tagTypes[type].type)) {
												return <button className={`action ${tagTypes[type].color}`} onClick={() => this.props.changeView('tag', tagTypes[type].type)} key={`tag-${tagTypes[type].type}`}>
													<i className={`fas fa-fw fa-${tagTypes[type].icon}`} /> {i18next.t(`TAG_TYPES.${type}`, { count: 2 })}
												</button>;
											}
										})}
										<button className="action" onClick={() => this.props.changeView('tag', YEARS.type)}>
											<i className={`fas fa-fw fa-${YEARS.icon}`} /> {i18next.t('DETAILS_YEAR')}
										</button>
										<button className="action" onClick={() => this.setState({ othersMenu: !this.state.othersMenu })}>
											<i className={this.state.othersMenu ? 'fa fa-fw fa-arrow-up' : 'fa fa-fw fa-arrow-down'} />
											{i18next.t('PUBLIC_HOMEPAGE.OTHERS')}
										</button>
										{this.state.othersMenu ?
											<>
												{Object.keys(tagTypes).map(type => {
													if (![1, 2, 4, 5].includes(tagTypes[type].type)) {
														return <button className={`action ${tagTypes[type].color}`} onClick={() => this.props.changeView('tag', tagTypes[type].type)} key={`tag-${tagTypes[type].type}`}>
															<i className={`fas fa-fw fa-${tagTypes[type].icon}`} /> {i18next.t(`TAG_TYPES.${type}`, { count: 2 })}
														</button>;
													}
												})}
											</> : null
										}
									</React.Fragment> : null
								}
							</div>
						</div>
						<LyricsBox kid={this.state.currentKid} />
					</div>
				</React.Fragment>
		);
	}
}

export default PublicHomepage;
