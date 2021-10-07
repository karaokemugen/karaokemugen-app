import './ProgressBar.scss';

import i18next from 'i18next';
import React, { Component, createRef } from 'react';

import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { secondsTimeSpanToHMS } from '../../../utils/tools';

interface IProps {
	lyrics?: boolean;
}

interface IState {
	mouseDown: boolean;
	refreshTime: number;
	playerStatus?: string;
	karaInfoText: string | React.ReactFragment;
	length: number;
	width: string;
	timePosition: number;
	animate: number;
	duration: number;
	animationPause: boolean;
}

class ProgressBar extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props: IProps) {
		super(props);
		this.state = {
			mouseDown: false,
			// Int (ms) : time unit between every call
			refreshTime: 1000,
			karaInfoText: i18next.t('KARA_PAUSED_WAITING'),
			length: -1,
			width: '0',
			timePosition: 0,
			animate: 0,
			duration: 0,
			animationPause: false,
		};
	}

	refBar = createRef<HTMLDivElement>();
	refCont = createRef<HTMLDivElement>();
	refP = createRef<HTMLParagraphElement>();
	timeout: NodeJS.Timeout;

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

	suspendAnimation = () => {
		if (!this.state.animationPause) {
			this.setState({ animationPause: true });
			this.timeout = setTimeout(() => {
				this.setState({ animationPause: false });
			}, 3000);
		}
	};

	async componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			try {
				const result = await commandBackend('getPlayerStatus');
				this.refreshPlayerInfos(result);
			} catch (e) {
				// already display
			}
		}
		getSocket().on('playerStatus', this.refreshPlayerInfos);
		window.addEventListener('resize', this.resizeCheck, { passive: true });
		if (this.refP.current) {
			this.refP.current.addEventListener('animationiteration', this.suspendAnimation, { passive: true });
		}
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.refreshPlayerInfos);
		window.removeEventListener('resize', this.resizeCheck);
		if (this.timeout) {
			clearTimeout(this.timeout);
		}
	}

	goToPosition(e: any) {
		const karaInfo = document.getElementById('karaInfo');
		if (karaInfo) {
			const barInnerwidth = karaInfo.offsetWidth;
			const futurTimeX = e.pageX - karaInfo.offsetLeft;
			const futurTimeSec = (this.state.length * futurTimeX) / barInnerwidth;
			if (!isNaN(futurTimeSec) && futurTimeSec >= 0) {
				this.setState({ width: e.pageX });
				commandBackend('sendPlayerCommand', { command: 'goTo', options: futurTimeSec }).catch(() => {});
			}
		}
	}

	karaInfoClick = (e: any) => {
		this.goToPosition(e);
	};

	resizeCheck = () => {
		if (this.refP?.current) {
			const offset =
				this.refP.current.getBoundingClientRect().width - this.refCont.current.getBoundingClientRect().width;
			if (offset > 0) {
				this.setState({ animate: -offset - 5, duration: Math.round(offset * 0.05) });
			} else {
				this.setState({ animate: 0 });
			}
		}
	};

	/**
	 * refresh the player infos
	 */
	refreshPlayerInfos = async (data: PublicPlayerState) => {
		const element = this.refBar.current;
		if (element && data.timeposition) {
			const newWidth =
				(element.offsetWidth * 10000 * (data.timeposition + this.state.refreshTime / 1000)) /
					this.state.length /
					10000 +
				'px';

			if (this.state.length !== 0) {
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
				this.setState({ karaInfoText: i18next.t('KARA_PAUSED_WAITING'), length: -1, animate: 0 });
			} else if (data.mediaType === 'Jingles') {
				this.setState({ karaInfoText: i18next.t('JINGLE_TIME'), length: -1, animate: 0 });
			} else if (data.mediaType === 'Intros') {
				this.setState({ karaInfoText: i18next.t('INTRO_TIME'), length: -1, animate: 0 });
			} else if (data.mediaType === 'Outros') {
				this.setState({ karaInfoText: i18next.t('OUTRO_TIME'), length: -1, animate: 0 });
			} else if (data.mediaType === 'Encores') {
				this.setState({ karaInfoText: i18next.t('ENCORES_TIME'), length: -1, animate: 0 });
			} else if (data.mediaType === 'Sponsors') {
				this.setState({ karaInfoText: i18next.t('SPONSOR_TIME'), length: -1, animate: 0 });
			} else if (data.mediaType === 'pauseScreen') {
				this.setState({ karaInfoText: i18next.t('PAUSE_TIME'), length: -1, animate: 0 });
			} else if (data.currentSong) {
				const kara = data.currentSong;
				const karaInfo = buildKaraTitle(this.context.globalState.settings.data, kara);

				this.setState({ karaInfoText: karaInfo, length: kara.duration }, this.resizeCheck);
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
					onMouseDown={this.mouseDown}
					onMouseUp={() => this.setState({ mouseDown: false })}
					onMouseMove={this.mouseMove}
					onMouseOut={this.mouseOut}
					ref={this.refBar}
				>
					<div className="actualTime">
						{this.state.timePosition > 0 &&
							this.state.length > 0 &&
							secondsTimeSpanToHMS(Math.round(this.state.timePosition), 'mm:ss')}
					</div>
					<div
						className={`karaTitle${this.state.animate !== 0 ? ' animate' : ''}${
							this.state.animationPause ? ' pause' : ''
						}`}
						style={{
							['--offset' as any]: `${this.state.animate}px`,
							['--duration' as any]: `${this.state.duration}s`,
						}}
						ref={this.refCont}
					>
						<p ref={this.refP}>{this.state.karaInfoText}</p>
					</div>

					<div className="remainTime">
						{this.state.length > 0 &&
							`-${secondsTimeSpanToHMS(
								Math.round(this.state.length - this.state.timePosition),
								'mm:ss'
							)}`}
					</div>
				</div>
				<div id="progressBarColor" style={{ width: this.state.width }} />
			</div>
		);
	}
}

export default ProgressBar;
