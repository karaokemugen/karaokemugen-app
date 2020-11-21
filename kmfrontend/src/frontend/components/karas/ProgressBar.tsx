import i18next from 'i18next';
import React, { Component } from 'react';

import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { secondsTimeSpanToHMS } from '../../../utils/tools';

require('./ProgressBar.scss');

interface IProps {
	scope: string;
	lyrics?: boolean;
}

interface IState {
	mouseDown: boolean;
	refreshTime: number;
	playerStatus?: string;
	karaInfoText: string|React.ReactFragment;
	length: number;
	width: string;
	timePosition: number;
}

class ProgressBar extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			mouseDown: false,
			// Int (ms) : time unit between every call
			refreshTime: 1000,
			karaInfoText: i18next.t('KARA_PAUSED_WAITING'),
			length: -1,
			width: '0',
			timePosition: 0
		};
	}

	mouseDown = (e: any) => {
		if (this.state.playerStatus && this.state.playerStatus !== 'stop' && this.state.length !== -1) {
			this.setState({ mouseDown: true, width: e.pageX });
		}
	};

	mouseMove = (e: any) => {
		if (this.state.mouseDown) {
			this.setState({ width: e.pageX });
		}
	};

	mouseOut = () => {
		if (this.state.mouseDown) {
			this.setState({ mouseDown: false });
		}
	};

	async componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			const result = await commandBackend('getPlayerStatus');
			this.refreshPlayerInfos(result);
		}
		getSocket().on('playerStatus', this.refreshPlayerInfos);
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.refreshPlayerInfos);
	}

	goToPosition(e: any) {
		const karaInfo = document.getElementById('karaInfo');
		if (karaInfo) {
			const barInnerwidth = karaInfo.offsetWidth;
			const futurTimeX = e.pageX - karaInfo.offsetLeft;
			const futurTimeSec = this.state.length * futurTimeX / barInnerwidth;
			if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
				this.setState({ width: e.pageX });
				commandBackend('sendPlayerCommand', { command: 'goTo', options: futurTimeSec });
			}
		}
	}

	karaInfoClick = (e: any) => {
		if (this.props.scope === 'admin' && this.state.playerStatus && this.state.playerStatus !== 'stop' && this.state.length !== -1) {
			this.goToPosition(e);
		}
	};

	/**
    * refresh the player infos
    */
	refreshPlayerInfos = async (data: PublicPlayerState) => {
		const element = document.getElementById('karaInfo');
		if (element) {
			const newWidth = element.offsetWidth *
				10000 * (data.timeposition + this.state.refreshTime / 1000) / this.state.length / 10000 + 'px';

			if (data.timeposition && this.state.length !== 0) {
				this.setState({ width: newWidth, timePosition: data.timeposition });
			}
		}
		if (data.playerStatus) {
			if (data.playerStatus === 'stop') {
				this.setState({ width: '0' });
			}
			this.setState({ playerStatus: data.playerStatus });
		}

		if (data.mediaType || data.currentSong) {
			this.setState({ width: '0' });
			if (data.mediaType === 'background') {
				this.setState({ karaInfoText: i18next.t('KARA_PAUSED_WAITING'), length: -1 });
			} else if (data.mediaType === 'Jingles') {
				this.setState({ karaInfoText: i18next.t('JINGLE_TIME'), length: -1 });
			} else if (data.mediaType === 'Intros') {
				this.setState({ karaInfoText: i18next.t('INTRO_TIME'), length: -1 });
			} else if (data.mediaType === 'Outros') {
				this.setState({ karaInfoText: i18next.t('OUTRO_TIME'), length: -1 });
			} else if (data.mediaType === 'Encores') {
				this.setState({ karaInfoText: i18next.t('ENCORES_TIME'), length: -1 });
			} else if (data.mediaType === 'Sponsors') {
				this.setState({ karaInfoText: i18next.t('SPONSOR_TIME'), length: -1 });
			} else {
				const kara = data.currentSong.currentSong;
				const karaInfo = buildKaraTitle(this.context.globalState.settings.data, kara);
				this.setState({ karaInfoText: karaInfo, length: kara.duration });
			}
		}
	};

	render() {
		return (
			<div id="progressBar">
				<div
					id="karaInfo"
					onDragStart={() => {
						return false;
					}}
					draggable={false}
					onClick={this.karaInfoClick}
					onMouseDown={this.mouseDown} onMouseUp={() => this.setState({ mouseDown: false })}
					onMouseMove={this.mouseMove} onMouseOut={this.mouseOut}
				>
					<div className="actualTime">{this.state.timePosition > 0 && this.state.length > 0 && secondsTimeSpanToHMS(Math.round(this.state.timePosition), 'mm:ss')}</div>
					<div className="karaTitle">{this.state.karaInfoText}</div>
					<div className="remainTime">{this.state.length > 0 && `-${secondsTimeSpanToHMS(Math.round(this.state.length-this.state.timePosition), 'mm:ss')}`}</div>
				</div>
				<div id="progressBarColor" style={{width: this.state.width}}/>
			</div>
		);
	}
}

export default ProgressBar;
