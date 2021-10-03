import './Tutorial.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { Trans } from 'react-i18next';

import KLogo from '../../../assets/Klogo.png';
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
		this.setState({ isLargeDevice: is_large_device() });
	}

	nextStep = () => {
		try {
			if (this.state.stepIndex === 2) {
				commandBackend('editMyAccount', { flag_tutorial_done: true });
				unmountComponentAtNode(document.getElementById('tuto'));
			}
			this.setState({ stepIndex: this.state.stepIndex + 1 });
		} catch (e) {
			// already display
		}
	}

	previousStep = () => {
		if (this.state.stepIndex !== 0) {
			this.setState({ stepIndex: this.state.stepIndex - 1 });
		}
	}

	render() {
		let slide = <></>;
		switch (this.state.stepIndex) {
			case 0:
				slide = <>
					<p className="title">{i18next.t('MODAL.TUTORIAL.WELCOME')}</p>
					<div className="playlists">
						<Trans
							i18nKey="MODAL.TUTORIAL.PLAYLIST"
							components={{ 2: <i className="fas fa-fw fa-plus" /> }}
						/>
						<br /><br />
						<div className="kara-line-image">
							<img src={TutoKaraLine} alt="KaraLine" />
							<p className="caption-left">
								<Trans
									i18nKey="MODAL.TUTORIAL.TITLE_CLICK"
									components={{ 1: !this.state.isLargeDevice ? <span /> : null }}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.PLAY_BUTTONS"
									components={{
										1: <i className="fas fa-fw fa-play" />,
										3: !this.state.isLargeDevice ? <span /> : null,
										5: <i className="fas fa-fw fa-play-circle" />
									}}
								/>
							</p>
							<p className="caption-right">
								<Trans
									i18nKey="MODAL.TUTORIAL.CHECK_CASE"
									components={{
										1: <i className="far fa-fw fa-square" />,
										3: <em />,
									}}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.ADD_TO_OTHER_PLAYLIST"
									components={{
										1: <i className="fas fa-fw fa-plus" />
									}}
								/>
								<br />
								<Trans
									i18nKey="MODAL.TUTORIAL.WRENCH_BUTTON"
									components={{
										1: <i className="fas fa-fw fa-wrench" />
									}}
								/>
							</p>
						</div>
						<Trans
							i18nKey="MODAL.TUTORIAL.KARAOKE_PLAYED"
							components={{
								1: <span className="orange" />,
								2: <i className="fas fa-fw fa-history" />
							}}
						/>
						<br />
						<Trans
							i18nKey="MODAL.TUTORIAL.KARAOKE_PLAYING"
							components={{
								1: <span className="blue" />
							}}
						/>
					</div>
				</>;
				break;
			case 1:
				slide = <div className="header-presentation">
					<ul>
						<li><i className="fas fa-fw fa-cog" /> {i18next.t('MODAL.TUTORIAL.CREATE_PLAYLIST_BUTTON')}</li>
						<li>
							<i className="fas fa-fw fa-list-ol" /> {i18next.t('MODAL.TUTORIAL.SELECT_PLAYLIST_BUTTON')}
							<ul className="ul-l1">
								<li><i className="fas fa-fw fa-book" /> {i18next.t('MODAL.TUTORIAL.LIBRARY')}</li>
								<li><i className="fas fa-fw fa-pencil-alt" /> <Trans
									i18nKey="MODAL.TUTORIAL.PLAYLIST_ATTRIBUTES"
									components={{
										1: <strong />,
										3: <strong />
									}}
								/></li>
								<li><i className="fas fa-fw fa-play-circle" /> <Trans
									i18nKey="MODAL.TUTORIAL.CURRENT_DESC"
									components={{ 1: <strong /> }}
								/></li>
								<li><i className="fas fa-fw fa-globe" /> <Trans
									i18nKey="MODAL.TUTORIAL.PUBLIC_DESC"
									components={{ 1: <strong /> }}
								/></li>
								<li><i className="fas fa-fw fa-info-circle" /> <Trans
									i18nKey="MODAL.TUTORIAL.CURRENT_PUBLIC_DESC"
									components={{
										1: <strong />,
										3: <strong />
									}}
								/></li>
								<li><i className="fas fa-fw fa-ban" /> {i18next.t('MODAL.TUTORIAL.BLACKLIST_DESC')}</li>
							</ul>
						</li>
					</ul>
				</div>;
				break;
			case 2:
				slide = <div className="player-presentation">
					<p>{i18next.t('MODAL.TUTORIAL.PLAYER_BAR')}</p>
					<ul>
						<li><i className="fas fa-fw fa-play-circle" />
							<Trans
								i18nKey="MODAL.TUTORIAL.PLAYER_CURRENT_HINT"
								components={{ 1: <strong /> }}
							/>
						</li>
						<li><i className="fas fa-fw fa-undo-alt" />
							<Trans
								i18nKey="MODAL.TUTORIAL.PLAYER_GO_BACK"
								components={{ 1: <strong /> }}
							/>
						</li>
						<li><i className="fas fa-fw fa-stop" />
							<Trans
								i18nKey="MODAL.TUTORIAL.PLAYER_STOP"
								components={{ 1: <strong /> }}
							/>
						</li>
						<li><i className="fas fa-fw fa-comment" />
							{i18next.t('MODAL.TUTORIAL.MESSAGE')}
						</li>
						<li>
							<span className="klogo">
								<img src={KLogo} alt="Karaoke Mugen logo" />
							</span>
							{i18next.t('MODAL.TUTORIAL.K_MENU')}
						</li>
					</ul>
					<div className="center"><button onClick={this.nextStep} className="step inline">
						<i className="fas fa-check" /> {i18next.t('MODAL.TUTORIAL.END')}
					</button></div>
				</div>;
				break;
			default:
				break;
		}
		return (<div className="tutorial">
			<div className={`dimmer${this.state.stepIndex > 0 ? ' transparent' : ''}${this.state.stepIndex === 2 ? ' player-bar' : ''}`} />
			{slide}
			<div className="steps">
				{this.state.stepIndex > 0 ? <button onClick={this.previousStep} className="step back">
					<i className="fas fa-arrow-left" /> {i18next.t('MODAL.TUTORIAL.BACK')}
				</button> : null}
				{this.state.stepIndex < 2 ? <button onClick={this.nextStep} className="step next">
					{i18next.t('MODAL.TUTORIAL.NEXT')} <i className="fas fa-arrow-right" />
				</button> : null}
			</div>
		</div>);
	}
}

export default Tutorial;
