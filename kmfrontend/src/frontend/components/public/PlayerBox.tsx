import './PlayerBox.scss';

import i18next from 'i18next';
import sample from 'lodash.sample';
import React, { Component, createRef, RefObject } from 'react';
import ResizeObserver from 'resize-observer-polyfill';

import { ASSLine } from '../../../../../src/lib/types/ass';
import { PublicPlayerState } from '../../../../../src/types/state';
import GlobalContext from '../../../store/context';
import { getPreviewLink, getSerieLanguage, sortTagByPriority } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { secondsTimeSpanToHMS } from '../../../utils/tools';

interface IProps {
	fixed: boolean
	show: boolean
	currentVisible: boolean
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
	showLyrics: boolean,
	kid: string,
	favorites: Set<string>
}

class PlayerBox extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	observer: ResizeObserver

	static resetBox = {
		title: i18next.t('KARA_PAUSED_WAITING'),
		subtitle: '',
		width: '0',
		length: 0,
		timePosition: 0,
		img: '',
		lyrics: [],
		kid: ''
	};

	constructor(props) {
		super(props);
		this.state = {
			...PlayerBox.resetBox,
			ref: createRef(),
			containerRef: createRef(),
			showLyrics: false,
			favorites: new Set<string>()
		};
	}

	resizeCheck = () => {
		this.props.onResize(`${this.state.containerRef.current.scrollHeight}px`);
	};

	getFavorites = async (payload?: string) => {
		if (payload === undefined || payload === this.context.globalState.auth.data.username) {
			const result = await commandBackend('getFavorites', { mini: true });
			const set = new Set<string>();
			for (const kara of result) {
				set.add(kara.kid);
			}
			this.setState({ favorites: set });
		}
	};

	toggleFavorite = async (event) => {
		event.stopPropagation();
		if (this.state.favorites.has(this.state.kid)) {
			await commandBackend('deleteFavorites', { kid: [this.state.kid] });
		} else {
			await commandBackend('addFavorites', { kid: [this.state.kid] });
		}
	}

	async componentDidMount() {
		if (this.context.globalState.auth.isAuthenticated) {
			const result = await commandBackend('getPlayerStatus');
			this.refreshPlayerInfos(result);
			if (!this.props.fixed && this.context.globalState.auth.data.role !== 'guest') {
				this.getFavorites();
			}
		}
		getSocket().on('playerStatus', this.refreshPlayerInfos);
		if (this.props.fixed) {
			this.observer = new ResizeObserver(this.resizeCheck);
			this.observer.observe(this.state.containerRef.current);
			this.resizeCheck();
		} else {
			if (this.context.globalState.auth.data.role !== 'guest') getSocket().on('favoritesUpdated', this.getFavorites);
		}
	}

	componentWillUnmount() {
		getSocket().off('playerStatus', this.refreshPlayerInfos);
		window.removeEventListener('resize', this.resizeCheck);
		if (this.observer) {
			this.observer.disconnect();
		} else {
			if (this.context.globalState.auth.data.role !== 'guest') getSocket().off('favoritesUpdated', this.getFavorites);
		}
	}

	/**
	 * refresh the player infos
	 */
	refreshPlayerInfos = async (data: PublicPlayerState) => {
		if (data.mediaType || data.currentSong) {
			this.setState({ width: '0' });
			if (data.mediaType === 'background') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('KARA_PAUSED_WAITING'),
					subtitle: sample(i18next.t('KARA_PAUSED_TAGLINES', { returnObjects: true }))
				});
				if (this.props.onKaraChange) this.props.onKaraChange(null);
			} else if (data.mediaType === 'Jingles') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('JINGLE_TIME'),
					subtitle: sample(i18next.t('JINGLE_TAGLINES', { returnObjects: true }))
				});
				if (this.props.onKaraChange) this.props.onKaraChange(null);
			} else if (data.mediaType === 'Intros') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('INTRO_TIME'),
					subtitle: sample(i18next.t('INTRO_TAGLINES', { returnObjects: true }))
				});
				if (this.props.onKaraChange) this.props.onKaraChange(null);
			} else if (data.mediaType === 'Outros') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('OUTRO_TIME'),
					subtitle: sample(i18next.t('OUTRO_TAGLINES', { returnObjects: true }))
				});
				if (this.props.onKaraChange) this.props.onKaraChange(null);
			} else if (data.mediaType === 'Encores') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('ENCORES_TIME'),
					subtitle: sample(i18next.t('ENCORES_TAGLINES', { returnObjects: true }))
				});
				if (this.props.onKaraChange) this.props.onKaraChange(null);
			} else if (data.mediaType === 'Sponsors') {
				this.setState({
					...PlayerBox.resetBox,
					title: i18next.t('SPONSOR_TIME'),
					subtitle: sample(i18next.t('SPONSOR_TAGLINES', { returnObjects: true }))
				});
				if (this.props.onKaraChange) this.props.onKaraChange(null);
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
					kid: kara.kid,
					img: `url(${getPreviewLink(kara)})`
				});
			}
		}

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
	};

	render() {
		return (
			<div onClick={this.props.currentVisible ? this.props.goToCurrentPL : undefined}
				className={`player-box${this.props.fixed ? ' fixed' : ''}`}
				style={{ ['--img' as any]: this.state.img, display: this.props.show ? undefined : 'none' }}
				ref={this.state.containerRef}>
				{!this.props.fixed ?
					<div className="first">
						<p>{i18next.t('PUBLIC_HOMEPAGE.NOW_PLAYING')}</p>
						{this.props.currentVisible ?
							<p className="next" tabIndex={0} onKeyDown={this.props.goToCurrentPL}>
								{i18next.t('PUBLIC_HOMEPAGE.NEXT')}<i className="fas fa-fw fa-chevron-right" />
							</p> : null
						}
					</div> : null
				}
				{this.props.fixed ?
					<div className="title inline">
						<h3 className="song">{this.state.title}</h3>
						<h4 className="series">{this.state.subtitle}</h4>
					</div> :
					<div className="title">
						<h3 className="song">{this.state.title}</h3>
						<h4 className="series">{this.state.subtitle}</h4>
					</div>}
				{!this.props.fixed && this.state.length !== 0 && this.context.globalState.auth.data.role !== 'guest' ?
					<button className="btn favorites" onClick={this.toggleFavorite}>
						<i className="fas fa-fw fa-star" />
						{this.state.favorites.has(this.state.kid) ? i18next.t('TOOLTIP_FAV_DEL') : i18next.t('TOOLTIP_FAV')}
					</button> : null}
				{this.state.length !== 0 ?
					<React.Fragment>
						{!this.props.fixed ?
							<div className="timers">
								<div>{secondsTimeSpanToHMS(Math.round(this.state.timePosition), 'mm:ss')}</div>
								<div>{secondsTimeSpanToHMS(this.state.length, 'mm:ss')}</div>
							</div> : null}
						<div className="progress-bar-container" ref={this.state.ref}>
							<div className="progress-bar" style={{ width: this.state.width }} />
						</div>
					</React.Fragment> : null}
			</div>);
	}
}

export default PlayerBox;
