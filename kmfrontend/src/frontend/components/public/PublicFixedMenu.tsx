import './PublicFixedMenu.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import GlobalContext from '../../../store/context';
import { View } from '../../types/view';

interface IProps {
	currentView: View
	publicVisible: boolean
	currentVisible: boolean
	changeView: (view: View) => void
}

class PlayerBox extends Component<IProps, unknown> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	render() {
		return (
			<div className="menu-bar">
				{this.props.currentVisible ?
					<a
						className="green"
						onClick={event => {
							event.preventDefault();
							this.props.changeView('currentPlaylist');
						}}>
						<i className="fas fa-fw fa-play-circle fa-2x" />
						{i18next.t('PUBLIC_HOMEPAGE.NEXT')}
					</a> : null
				}
				{this.props.publicVisible
					&& this.context.globalState.settings.data.state.currentPlaylistID !== this.context.globalState.settings.data.state.publicPlaylistID ?
					<a
						className="orange"
						onClick={event => {
							event.preventDefault();
							this.props.changeView('publicPlaylist');
						}}>
						<i className="fas fa-fw fa-globe fa-2x" />
						{i18next.t('PUBLIC_HOMEPAGE.PUBLIC_SUGGESTIONS_SHORT')}
					</a> : null
				}
				<a className="blue"
					onClick={event => {
						event.preventDefault();
						this.props.changeView('search');
					}}>
					<i className="fas fa-fw fa-search fa-2x" />
					{i18next.t('PUBLIC_HOMEPAGE.SONG_SEARCH_SHORT')}
				</a>
			</div>
		);
	}
}

export default PlayerBox;
