import React, { Component } from 'react';
import i18next from 'i18next';
import axios from 'axios';
import { buildKaraTitle, getSocket } from '../tools';
import { PublicPlayerState } from '../../../../src/types/state';
import store from '../../store';

require('./ProgressBar.scss');

interface IProps {
	scope: string;
	webappMode?: number;
	lyrics?: boolean;
}

interface IState {
	mouseDown: boolean;
	oldState?: PublicPlayerState | undefined;
	refreshTime: number;
	playerStatus?: string;
	karaInfoText: string | JSX.Element;
	karaTitle?: string;
	length: number;
	width: string;
}

class ProgressBar extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			mouseDown: false,
			// Int (ms) : time unit between every call
			refreshTime: 1000,
			karaInfoText: i18next.t('KARA_PAUSED_WAITING'),
			length: -1,
			width: '0'
		};
	}

	mouseDown = (e: any) => {
		if (this.state.playerStatus && this.state.playerStatus != 'stop' && this.state.length != -1) {
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

	componentDidMount() {
		getSocket().on('playerStatus', this.refreshPlayerInfos);
	}

	async goToPosition(e: any) {
		let karaInfo = document.getElementById('karaInfo');
		if (karaInfo) {
			let barInnerwidth = karaInfo.offsetWidth;
			let futurTimeX = e.pageX - karaInfo.offsetLeft;
			let futurTimeSec = this.state.length * futurTimeX / barInnerwidth;
			if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
				this.setState({ width: e.pageX });
				axios.put('/player', { command: 'goTo', options: futurTimeSec });
			}
		}
	}

	karaInfoClick = (e: any) => {
		if (this.props.scope === 'admin' && this.state.playerStatus && this.state.playerStatus != 'stop' && this.state.length != -1) {
			this.goToPosition(e);
		}
	};

    /**
    * refresh the player infos
    */
	refreshPlayerInfos = async (data: PublicPlayerState) => {
		let element = document.getElementById('karaInfo');
		if (element) {
			let newWidth = element.offsetWidth *
				10000 * (data.timePosition + this.state.refreshTime / 1000) / this.state.length / 10000 + 'px';

			if (!this.state.oldState || data.timePosition != this.state.oldState.timePosition && this.state.length != 0) {
				this.setState({ width: newWidth });
			}
		}
		if (!this.state.oldState || this.state.oldState.playerStatus != data.playerStatus) {
			if (data.playerStatus === 'stop') {
				this.setState({ width: '0' });
			}
			this.setState({ playerStatus: data.playerStatus });
		}

		if (!this.state.oldState || data.currentlyPlaying !== this.state.oldState.currentlyPlaying) {
			this.setState({ width: '0' });
			if (data.currentlyPlaying === null) {
				this.setState({ karaInfoText: i18next.t('KARA_PAUSED_WAITING'), length: -1, karaTitle: undefined });
			} else if (data.currentlyPlaying === 'Jingles') {
				this.setState({ karaInfoText: i18next.t('JINGLE_TIME'), length: -1, karaTitle: undefined });
			} else if (data.currentlyPlaying === 'Intros') {
				this.setState({ karaInfoText: i18next.t('INTRO_TIME'), length: -1, karaTitle: undefined });
			} else if (data.currentlyPlaying === 'Outros') {
				this.setState({ karaInfoText: i18next.t('OUTRO_TIME'), length: -1, karaTitle: undefined });
			} else if (data.currentlyPlaying === 'Encores') {
				this.setState({ karaInfoText: i18next.t('ENCORES_TIME'), length: -1, karaTitle: undefined });
			} else if (data.currentlyPlaying === 'Sponsors') {
				this.setState({ karaInfoText: i18next.t('SPONSOR_TIME'), length: -1, karaTitle: undefined });
			} else if (store.getLogInfos()) {
				let response = await axios.get('/karas/' + data.currentlyPlaying);
				let kara = response.data;
				let karaInfoText = buildKaraTitle(kara, true);
				this.setState({ karaTitle: karaInfoText as string, length: kara.duration });
			}
		}

		if (this.props.lyrics || (this.props.scope === 'public' && this.props.webappMode == 1)) {
			let text = data.subText;
			if (text) {
				text = text.indexOf('\n') == -1 ? text : text.substring(0, text.indexOf('\n'));
				this.setState({ karaInfoText: text });
			}
		} else {
			this.setState({ karaInfoText: this.state.karaTitle || this.state.karaInfoText });
		}

		this.setState({ oldState: data });
	};

	render() {
		return (
			<div id="progressBar">
				<div id="karaInfo" onDragStart={() => {
					return false;
				}} draggable={false}
					onClick={this.karaInfoClick}
					onMouseDown={this.mouseDown} onMouseUp={() => this.setState({ mouseDown: false })}
					onMouseMove={this.mouseMove} onMouseOut={this.mouseOut}
				><div className="karaTitle">{this.state.karaInfoText}</div></div>
				<div id="progressBarColor" style={{ width: this.state.width }}></div>
			</div>
		);
	}
}

export default ProgressBar;
