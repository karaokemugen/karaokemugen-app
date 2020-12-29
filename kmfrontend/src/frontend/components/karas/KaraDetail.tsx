import './KaraDetail.scss';

import i18next from 'i18next';
import React, { Component, MouseEvent, ReactNode } from 'react';
import ReactDOM, { createPortal } from 'react-dom';

import { DBKaraTag, lastplayed_ago } from '../../../../../src/lib/types/database/kara';
import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { setBgImage } from '../../../store/actions/frontendContext';
import GlobalContext, { GlobalContextInterface } from '../../../store/context';
import { getPreviewLink, getSerieLanguage, getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import { is_touch_device, secondsTimeSpanToHMS } from '../../../utils/tools';

interface IProps {
	kid: string | undefined;
	scope: string;
	idPlaylist?: number;
	playlistcontentId?: number;
	showVideo?: (file: string) => void;
	context: GlobalContextInterface;
	closeOnPublic?: () => void;
}

interface IState {
	kara?: DBPLCInfo;
	showLyrics: boolean;
	isFavorite: boolean;
	lyrics: Array<string>;
}

class KaraDetail extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			showLyrics: false,
			isFavorite: false,
			lyrics: []
		};
		if (this.props.kid || this.props.idPlaylist) {
			this.getKaraDetail();
		}
	}

	keyObserverHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && !document.getElementById('video')) {
			this.closeModal();
		}
	}

	setBg = () => {
		if (this.props.scope === 'admin') {
			return;
		}
		const generated = this.state.kara ? `url('${getPreviewLink(this.state.kara)}')` : 'none';
		if (generated !== this.context.globalState.frontendContext.backgroundImg) {
			setBgImage(this.context.globalDispatch, generated);
		}
	}

	closeModal() {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	componentDidUpdate() {
		this.setBg();
	}

	componentDidMount() {
		if (this.props.scope === 'admin' && !is_touch_device())
			document.addEventListener('keyup', this.keyObserverHandler);
		this.setBg();
	}

	componentWillUnmount() {
		if (this.props.scope === 'admin' && !is_touch_device())
			document.removeEventListener('keyup', this.keyObserverHandler);
		if (this.props.scope === 'public')
			setBgImage(this.context.globalDispatch, 'none');
	}

	onClickOutsideModal = (e: MouseEvent) => {
		const myElementToCheckIfClicksAreInsideOf = document.getElementsByClassName('modal-dialog')[0];
		if (!myElementToCheckIfClicksAreInsideOf?.contains((e.target as Node))) {
			this.closeModal();
		}
	}

	getKaraDetail = async (kid?: string) => {
		let url;
		let data;
		if (this.props.idPlaylist && this.props.idPlaylist > 0) {
			url = 'getPLC';
			data = { pl_id: this.props.idPlaylist, plc_id: this.props.playlistcontentId };
		} else {
			url = 'getKara';
			data = { kid: (kid ? kid : this.props.kid) };
		}
		const kara = await commandBackend(url, data);
		await this.setState({
			kara: kara,
			isFavorite: kara.flag_favorites || this.props.idPlaylist === -5
		});
		if (kara.subfile) this.showFullLyrics();
	};

	getLastPlayed = (lastPlayed_at: Date, lastPlayed: lastplayed_ago) => {
		if (
			lastPlayed &&
			!lastPlayed.days &&
			!lastPlayed.months &&
			!lastPlayed.years
		) {
			const timeAgo =
				(lastPlayed.seconds ? lastPlayed.seconds : 0) +
				(lastPlayed.minutes ? lastPlayed.minutes * 60 : 0) +
				(lastPlayed.hours ? lastPlayed.hours * 3600 : 0);
			const timeAgoStr =
				lastPlayed.minutes || lastPlayed.hours
					? secondsTimeSpanToHMS(timeAgo, 'hm')
					: secondsTimeSpanToHMS(timeAgo, 'ms');

			return i18next.t('DETAILS_LAST_PLAYED_2', { time: timeAgoStr });
		} else if (lastPlayed_at) {
			return i18next.t('DETAILS_LAST_PLAYED', { date: new Date(lastPlayed_at).toLocaleDateString() });
		}
		return null;
	};

	showFullLyrics = async () => {
		if (this.state.kara) {
			const response = await commandBackend('getKaraLyrics', { kid: (this.state.kara as DBPLCInfo).kid });
			this.setState({ lyrics: response.map(value => value.text) });
		}
	};

	getTagInLocale = (e: DBKaraTag) => {
		return <span key={e.tid} className={e.problematic ? 'problematicTag' : 'inlineTag'}>
			{getTagInLocale(e)}
		</span>;
	};

	onClick = () => {
		const element = document.getElementById('modal');
		if (element) ReactDOM.unmountComponentAtNode(element);
	}

	makeFavorite = () => {
		this.state.isFavorite ?
			commandBackend('deleteFavorites', { 'kid': [this.props.kid] }) :
			commandBackend('addFavorites', { 'kid': [this.props.kid] });
		this.setState({ isFavorite: !this.state.isFavorite });
	};

	compareTag = (a: DBKaraTag, b: DBKaraTag) => {
		return a.name.localeCompare(b.name);
	}

	placeHeader = (headerEl: ReactNode) => createPortal(headerEl, document.getElementById('menu-supp-root'));

	render() {
		if (this.state.kara) {
			const data = this.state.kara;

			// Tags in the header
			const karaTags = [];

			if (data.langs) {
				const isMulti = data.langs.find(e => e.name.indexOf('mul') > -1);
				isMulti ? karaTags.push(<div key={isMulti.tid} className="tag">
					{getTagInLocale(isMulti)}
				</div>) : karaTags.push(...data.langs.sort(this.compareTag).map(tag => {
					return <div key={tag.tid} className="tag green" title={tag.short ? tag.short : tag.name}>
						{getTagInLocale(tag)}
					</div>;
				}));
			}
			if (data.songtypes) {
				karaTags.push(...data.songtypes.sort(this.compareTag).map(tag => {
					return <div key={tag.tid} className="tag green" title={tag.short ? tag.short : tag.name}>
						{getTagInLocale(tag)}{data.songorder > 0 ? ' ' + data.songorder : ''}
					</div>;
				}));
			}
			for (const type of ['FAMILIES', 'PLATFORMS', 'GENRES', 'ORIGINS', 'GROUPS', 'MISC']) {
				const typeData = tagTypes[type];
				if (data[typeData.karajson]) {
					karaTags.push(...data[typeData.karajson].sort(this.compareTag).map(tag => {
						return <div key={tag.tid} className={`tag ${typeData.color}`} title={tag.short ? tag.short : tag.name}>{getTagInLocale(tag)}</div>;
					}));
				}
			}

			// Tags in the page/modal itself (singers, songwriters, creators, karaoke authors)
			const karaBlockTags = [];
			for (const type of ['SINGERS', 'SONGWRITERS', 'CREATORS', 'AUTHORS']) {
				const tagData = tagTypes[type];
				if (data[tagData.karajson].length > 0) {
					karaBlockTags.push(<div className={`detailsKaraLine colored ${tagData.color}`} key={tagData.karajson}>
						<i className={`fas fa-fw fa-${tagData.icon}`} />
						<div>
							{i18next.t(`KARA.${type}_BY`)}
							<span className="detailsKaraLineContent"> {data[tagData.karajson].map(e => this.getTagInLocale(e)).reduce((acc, x, index, arr): any => acc === null ? [x] : [acc, (index + 1 === arr.length) ? <span className={`colored ${tagData.color}`}> {i18next.t('AND')} </span> : <span className={`colored ${tagData.color}`}>, </span>, x], null)}</span>
						</div>
					</div>);
				}
			}

			const playTime = new Date(Date.now() + data.time_before_play * 1000);
			const details = (
				<React.Fragment>
					<div className="detailsKaraLine timeData">
						<span>
							<i className="fas fa-fw fa-clock" />
							{secondsTimeSpanToHMS(data.duration, 'mm:ss')}
						</span>
						<span>
							{data.time_before_play
								? i18next.t('DETAILS_PLAYING_IN', {
									time: secondsTimeSpanToHMS(data.time_before_play, 'hm'),
									date: playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2)
								})
								: (data.lastplayed_ago
									? this.getLastPlayed(data.lastplayed_at, data.lastplayed_ago)
									: '')
							}
						</span>
					</div>
					{data.upvotes && this.props.scope === 'admin' ?
						<div className="detailsKaraLine">
							<span
								title={i18next.t('UPVOTE_NUMBER')}>
								<i className="fas fa-thumbs-up" />
								{data.upvotes}
							</span>
						</div> : null
					}
					<div className="detailsKaraLine">
						<span>
							{i18next.t('DETAILS_ADDED')}
							{data.created_at ? <>
								{i18next.t('DETAILS_ADDED_2')}
								<span className="boldDetails">{new Date(data.created_at).toLocaleString()}</span>
							</> : null
							}
							{data.nickname ? <>
								{i18next.t('DETAILS_ADDED_3')}
								<span className="boldDetails">{data.nickname}</span>
							</> : null
							}
						</span>
					</div>
					{karaBlockTags}
					<div className="detailsKaraLine">
						<span className="boldDetails">
							<i className={`fas fa-fw fa-${YEARS.icon}`} />
							{data.year}
						</span>
					</div>
				</React.Fragment>
			);

			const makeFavButton = (
				<button
					type="button"
					onClick={this.makeFavorite}
					className={`makeFav btn btn-action${this.state.isFavorite ? ' currentFav' : ''}`}
				>
					<i className="fas fa-fw fa-star" />
					<span>{this.state.isFavorite ? i18next.t('TOOLTIP_FAV_DEL') : i18next.t('TOOLTIP_FAV')}</span>
				</button>
			);

			const showVideoButton = (
				<button
					type="button"
					className="showVideo btn btn-action"
					onClick={() => this.props.showVideo && this.props.showVideo((data as DBPLCInfo).mediafile)}
				>
					<i className="fas fa-fw fa-video" />
					<span>{i18next.t('TOOLTIP_SHOWVIDEO')}</span>
				</button>
			);

			const lyricsKara = (
				<div className="lyricsKara detailsKaraLine">
					{this.state.lyrics?.length > 0 ? <div className="boldDetails">
						<i className="fas fa-fw fa-closed-captioning" />
						{i18next.t('LYRICS')}
					</div> : null}
					{data.subfile && this.state.lyrics?.map((ligne, index) => {
						return (
							<React.Fragment key={index}>
								{ligne}
								<br />
							</React.Fragment>
						);
					})}
				</div>
			);

			const header = (
				<div className={`modal-header img-background${this.props.scope === 'public' ? ' fixed' : ''}`} style={{ ['--img' as any]: this.props.scope === 'admin' ? `url('/previews/${data.kid}.${data.mediasize}.25.jpg')` : 'none' }}>
					<div className="modal-header-title">
						{this.props.scope === 'public' ?
							<button
								className="transparent-btn"
								type="button" onClick={this.props.closeOnPublic}>
								<i className="fas fa-fw fa-arrow-left" />
							</button> : null}
						<div className="modal-title-block">
							<h4 className="modal-title">{data.title}</h4>
							<h5 className="modal-series">{data.series[0] ? getSerieLanguage(this.props.context.globalState.settings.data, data.series[0], data.langs[0].name) : getTagInLocale(data.singers[0])}</h5>
						</div>
						{this.props.scope === 'admin' ?
							<button
								className="transparent-btn"
								type="button" onClick={this.closeModal}>
								<i className="fas fa-fw fa-times" />
							</button> : null}
					</div>
					<div className="tagConteneur">
						{karaTags}
					</div>
				</div>
			);

			let infoKaraTemp;
			if (this.props.scope === 'admin') {
				infoKaraTemp = (
					<div className="modal modalPage" onClick={this.onClickOutsideModal}>
						<div className="modal-dialog">
							<div className="modal-content">
								{header}
								<div className="detailsKara">
									<div className="centerButtons">
										{this.props.context.globalState.auth.data.role === 'guest' ? null : makeFavButton}
										{showVideoButton}
										{data.subfile ? (
											<button
												type="button"
												className="fullLyrics btn btn-action"
												onClick={() => this.setState({ showLyrics: !this.state.showLyrics })}
											>
												<i className="fas fa-fw fa-quote-right" />
												<span>{i18next.t('TOOLTIP_SHOWLYRICS')}</span>
											</button>
										) : null}
									</div>
									{details}
									{this.state.showLyrics ? lyricsKara : null}
								</div>
							</div>
						</div>
					</div>
				);
			} else {
				infoKaraTemp = (
					<React.Fragment>
						{this.props.scope === 'public' ?
							this.placeHeader(header) : header}
						<div className="detailsKara">
							<div className="centerButtons">
								{this.props.context.globalState.auth.data.role === 'guest' ? null : makeFavButton}
								{showVideoButton}
							</div>
							{details}
							{lyricsKara}
						</div>

					</React.Fragment>
				);
			}
			return infoKaraTemp;
		} else {
			return null;
		}
	}
}

export default KaraDetail;
