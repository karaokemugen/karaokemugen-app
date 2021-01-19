import './Tutorial.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import { unmountComponentAtNode } from 'react-dom';

import TutoKaraLine from '../../../assets/tuto_karaline.png';
import { commandBackend } from '../../../utils/socket';
import { is_large_device } from '../../../utils/tools';

interface IState {
	stepIndex: number;
	isLargeDevice: boolean;
}

class Tutorial extends Component<unknown, IState> {
	state = {
		stepIndex: 0,
		isLargeDevice: is_large_device()
	};

	componentDidMount() {
		window.addEventListener('resize', this.resize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.resize);
	}

	resize = () => {
		this.setState({isLargeDevice: is_large_device()});
	}

	nextStep = () => {
		if (this.state.stepIndex === 2) {
			unmountComponentAtNode(document.getElementById('tuto'));
			commandBackend('editMyAccount', { flag_tutorial_done: true });
		}
		this.setState({ stepIndex: this.state.stepIndex + 1 });
	}

	render() {
		let slide = <></>;
		switch (this.state.stepIndex) {
		case 0:
			slide = <>
				<p className="title">{i18next.t('MODAL.TUTORIAL.WELCOME')}</p>
				<div className="playlists">
					{i18next.t('MODAL.TUTORIAL.PLAYLIST')} <i className="fas fa-fw fa-plus" />.
					<br /><br />
					<div className="kara-line-image">
						<img src={TutoKaraLine} alt="KaraLine" />
						<p className="caption-left">
							{i18next.t('MODAL.TUTORIAL.TITLE_CLICK')}
							{!this.state.isLargeDevice ?
								<>
										&nbsp;{i18next.t('MODAL.TUTORIAL.TITLE_CLICK_DESC')}
								</> : null}.<br />
							{i18next.t('MODAL.TUTORIAL.THE_BUTTON')} <i className="fas fa-fw fa-play" title="Lecture" /> {i18next.t('MODAL.TUTORIAL.PLAY_BUTTON')}
							{!this.state.isLargeDevice ?
								<>
										&nbsp;({i18next.t('MODAL.TUTORIAL.THE_BUTTON')} <i className="fas fa-fw fa-play-circle" /> {i18next.t('MODAL.TUTORIAL.CURSOR_BUTTON')})
								</> : null}.
						</p>
						<p className="caption-right">
							{i18next.t('MODAL.TUTORIAL.CHECK_CASE')} <i className="far fa-fw fa-square" title="Case à cocher" /> {i18next.t('MODAL.TUTORIAL.CHECK_CASE_ADD')} <em>{i18next.t('MODAL.TUTORIAL.CHECK_CASE_MORE')}</em>.<br />
							{i18next.t('MODAL.TUTORIAL.THE_BUTTON')} <i className="fas fa-fw fa-plus" title="Ajout" /> {i18next.t('MODAL.TUTORIAL.ADD_TO_OTHER_PLAYLIST')}<br />
							{i18next.t('MODAL.TUTORIAL.WRENCH_BUTTON')} <i className="fas fa-fw fa-wrench" /> {i18next.t('MODAL.TUTORIAL.WRENCH_BUTTON_DESC')}
						</p>
					</div>
					{i18next.t('MODAL.TUTORIAL.LINES_WITH')} <span className="orange">{i18next.t('MODAL.TUTORIAL.ORANGE')}</span> {i18next.t('MODAL.TUTORIAL.KARAOKE_PLAYED')}<br />
					{i18next.t('MODAL.TUTORIAL.LINE_WITH')} <span className="blue">{i18next.t('MODAL.TUTORIAL.BLUE')}</span> {i18next.t('MODAL.TUTORIAL.KARAOKE_PLAYING')}
				</div>
			</>;
			break;
		case 1:
			slide = <div className="header-presentation">
				<ul>
					<li><i className="fas fa-fw fa-wrench" /> {i18next.t('MODAL.TUTORIAL.CREATE_PLAYLIST_BUTTON')}</li>
					<li>
						<i className="fas fa-fw fa-list" /> {i18next.t('MODAL.TUTORIAL.SELECT_PLAYLIST_BUTTON')}
						<ul className="ul-l1">
							<li><i className="fas fa-fw fa-book" /> {i18next.t('MODAL.TUTORIAL.LIBRARY')}<br />
								{i18next.t('MODAL.TUTORIAL.DOWNLOAD')} <a href="/system/km/karas/download" target="_blank">{i18next.t('MODAL.TUTORIAL.SYSTEM_PANEL')}</a>.</li>
							<li><i className="fas fa-fw fa-play-circle" /> {i18next.t('MODAL.TUTORIAL.THE_PLAYLIST')} <strong>{i18next.t('MODAL.TUTORIAL.CURRENT')}</strong> {i18next.t('MODAL.TUTORIAL.CURRENT_DESC')}</li>
							<li><i className="fas fa-fw fa-globe" /> {i18next.t('MODAL.TUTORIAL.THE_PLAYLIST')} <strong>{i18next.t('MODAL.TUTORIAL.PUBLIC')}</strong> {i18next.t('MODAL.TUTORIAL.PUBLIC_DESC')}</li>
							<li><i className="fas fa-fw fa-info-circle" /> {i18next.t('MODAL.TUTORIAL.THE_PLAYLIST')} <strong>{i18next.t('MODAL.TUTORIAL.CURRENT')}</strong> {i18next.t('MODAL.TUTORIAL.AND')} <strong>{i18next.t('MODAL.TUTORIAL.PUBLIC')}</strong> {i18next.t('MODAL.TUTORIAL.CURRENT_PUBLIC_DESC')}</li>
						</ul>
					</li>
				</ul>
			</div>;
			break;
		case 2:
			slide = <div className="player-presentation">
				<ul>
					<li><i className="fas fa-fw fa-play" />
						{i18next.t('MODAL.TUTORIAL.PLAYER_BAR')}
					</li>
					<li><i className="fas fa-fw fa-play-circle" />
						{i18next.t('MODAL.TUTORIAL.PLAYER_CURRENT_HINT')}&nbsp;
						<strong>
							{i18next.t('MODAL.TUTORIAL.PLAYER_CURRENT_HINT2')}
						</strong>
						.
					</li>
					<li><i className="fas fa-fw fa-undo-alt" />
						{i18next.t('MODAL.TUTORIAL.PLAYER_GO_BACK')}&nbsp;
						<strong>
							{i18next.t('MODAL.TUTORIAL.PLAYER_GOING_BACK')}&nbsp;
						</strong>
						{i18next.t('MODAL.TUTORIAL.PLAYER_GO_BACK_2')}
						.
					</li>
					<li><i className="fas fa-fw fa-stop" />
						{i18next.t('MODAL.TUTORIAL.PLAYER_STOP')}&nbsp;
						<strong>
							{i18next.t('MODAL.TUTORIAL.NOW')}
						</strong>
						.
					</li>
					<li><i className="fas fa-fw fa-comment" />
						{i18next.t('MODAL.TUTORIAL.MESSAGE')}
					</li>
					<li><span className="klogo" />
						{i18next.t('MODAL.TUTORIAL.K_MENU')}
					</li>
				</ul>
			</div>;
			break;
		default:
			break;
		}
		return (<div className="tutorial">
			<div className={`dimmer${this.state.stepIndex > 0 ? ' transparent':''}${this.state.stepIndex === 2 ? ' player-bar':''}`} />
			{slide}
			<button onClick={this.nextStep} className="next">
				{this.state.stepIndex > 1 ?
					<>
						<i className="fas fa-check" /> {i18next.t('MODAL.TUTORIAL.END')}
					</>:<>
						{i18next.t('MODAL.TUTORIAL.NEXT')} <i className="fas fa-arrow-right" />
					</>}
			</button>
		</div>);
	}
}

export default Tutorial;
