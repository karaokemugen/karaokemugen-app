import './PlayerBox.scss';

import i18next from 'i18next';
import React, {Component, createRef, RefObject} from 'react';
import ReactTextLoop from 'react-text-loop';

import {ASSLine} from '../../../../../src/lib/types/ass';
import {PublicPlayerState} from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import {getPreviewLink, getSerieLanguage, sortTagByPriority} from '../../../utils/kara';
import {commandBackend, getSocket} from '../../../utils/socket';
import { secondsTimeSpanToHMS } from '../../../utils/tools';

interface IProps {
	fixed: boolean
	show: boolean
	goToCurrentPL: () => void
	onResize?: (bottom: string) => void
	onKaraChange?: (kid: string) => void
}

interface IState {
	width: string,
	ref: RefObject<HTMLDivElement>,
	containerRef: RefObject<HTMLDivElement>,
	title: string,
	subtitle: string,
	length: number,
	timePosition: number,
	img: string,
	lyrics: ASSLine[],
	showLyrics: boolean
}

class PlayerBox extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	static resetBox = {
		title: i18next.t('KARA_PAUSED_WAITING'),
		subtitle: '',
		width: '0',
		length: 0,
		timePosition: 0,
		img: '',
		lyrics: []
	};

	constructor(props) {
		super(props);
		this.state = {
			...PlayerBox.resetBox,
			ref: createRef(),
			containerRef: createRef(),
			showLyrics: false
		};
	}

	resizeCheck = () => {
		this.props.onResize(`${this.state.containerRef.current.scrollHeight}px`);
	};

	async componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			const result = await commandBackend('getPlayerStatus');
			this.refreshPlayerInfos(result);
		}
		getSocket().on('playerStatus', this.refreshPlayerInfos);
		if (this.props.fixed) {
			this.resizeCheck();
			window.addEventListener('resize', this.resizeCheck);
		}
	}

	componentDidUpdate(prevProps: Readonly<IProps>, prevState: Readonly<IState>) {
		if (this.props.fixed && (prevProps.show !== this.props.show || prevState.timePosition !== this.state.timePosition || prevState.subtitle !== this.state.subtitle)) {
			this.resizeCheck();
		}
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.refreshPlayerInfos);
		window.removeEventListener('resize', this.resizeCheck);
	}

	/**
	 * refresh the player infos
	 */
	refreshPlayerInfos = async (data: PublicPlayerState) => {
		if (this.state.ref.current) {
			const newWidth = this.state.ref.current.offsetWidth *
				(data.timeposition) / this.state.length + 'px';

			if (data.timeposition && this.state.length !== 0) {
				this.setState({
					width: newWidth,
					timePosition: data.timeposition
				});
			}
		}

		if (data.mediaType || data.currentSong) {
			this.setState({ width: '0' });
			if (data.mediaType === 'background') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('KARA_PAUSED_WAITING')
				});
			} else if (data.mediaType === 'Jingles') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('JINGLE_TIME')
				});
			} else if (data.mediaType === 'Intros') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('INTRO_TIME')
				});
			} else if (data.mediaType === 'Outros') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('OUTRO_TIME')
				});
			} else if (data.mediaType === 'Encores') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('ENCORES_TIME')
				});
			} else if (data.mediaType === 'Sponsors') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('SPONSOR_TIME')
				});
			} else {
				const kara = data.currentSong.currentSong;
				const serieText = kara.series?.length > 0 ? kara.series.slice(0, 3).map(e => getSerieLanguage(this.context.globalState.settings.data, e, kara.langs[0].name)).join(', ')
					+ (kara.series.length > 3 ? '...' : '')
					: (kara.singers ? kara.singers.slice(0, 3).map(e => e.name).join(', ') + (kara.singers.length > 3 ? '...' : '') : '');
				const songtypeText = kara.songtypes.sort(sortTagByPriority).map(e => e.short ? + e.short : e.name).join(' ');
				const songorderText = kara.songorder > 0 ? ' ' + kara.songorder : '';
				if (this.props.onKaraChange) this.props.onKaraChange(kara.kid);
				this.setState({
					...PlayerBox.resetBox,
					title: kara.title,
					subtitle: `${serieText} - ${songtypeText}${songorderText}`,
					length: kara.duration,
					img: `url(${getPreviewLink(kara)})`
				});
			}
		}
	};

	render() {
		return (
			<div onClick={this.props.goToCurrentPL}
				 className={`player-box${this.props.fixed ? ' fixed':''}`}
				 style={{['--img' as any]: this.state.img, display: ((this.props.fixed && !this.state.subtitle) || !this.props.show) ? 'none':undefined}}
				 ref={this.state.containerRef}>
				{!this.props.fixed ? <div className="first">
					<p>{i18next.t('PUBLIC_HOMEPAGE.NOW_PLAYING')}</p>
					<p className="next" tabIndex={0}>{i18next.t('PUBLIC_HOMEPAGE.NEXT')}</p>
				</div>:null}
				{!this.props.fixed ?
					<div className="title">
						<h3 className="song">{this.state.title}</h3>
						<h4 className="series">{this.state.subtitle}</h4>
					</div> :
					(this.state.subtitle ?
						<ReactTextLoop interval={[4500,6000]} mask className="title">
							<h3 className="song">{this.state.title}</h3>
							<h3 className="song">{this.state.subtitle}</h3>
						</ReactTextLoop>:null)}
				{this.state.length !== 0 ?
					<React.Fragment>
						{!this.props.fixed ?
							<div className="timers">
								<div>{secondsTimeSpanToHMS(Math.round(this.state.timePosition), 'mm:ss')}</div>
								<div>{secondsTimeSpanToHMS(this.state.length, 'mm:ss')}</div>
							</div>:null}
						<div className="progress-bar-container" ref={this.state.ref}>
							<div className="progress-bar" style={{width: this.state.width}} />
						</div>
					</React.Fragment>:null}
			</div>);
	}
}

export default PlayerBox;
