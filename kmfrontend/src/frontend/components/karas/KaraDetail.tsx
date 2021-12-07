import './KaraDetail.scss';

import i18next from 'i18next';
import { Fragment, MouseEvent, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';

import { DBKaraTag, lastplayed_ago } from '../../../../../src/lib/types/database/kara';
import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import nanamiSingPng from '../../../assets/nanami-sing.png';
import nanamiSingWebP from '../../../assets/nanami-sing.webp';
import { setBgImage } from '../../../store/actions/frontendContext';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { useDeferredEffect } from '../../../utils/hooks';
import {
	buildKaraTitle,
	computeTagsElements,
	formatLyrics,
	getPreviewLink,
	getTitleInLocale,
	sortTagByPriority,
} from '../../../utils/kara';
import { commandBackend, isRemote } from '../../../utils/socket';
import { tagTypes, YEARS } from '../../../utils/tagTypes';
import {
	displayMessage,
	is_touch_device,
	isNonStandardPlaylist,
	nonStandardPlaylists,
	secondsTimeSpanToHMS,
} from '../../../utils/tools';
import { View } from '../../types/view';
import MakeFavButton from '../generic/buttons/MakeFavButton';
import ShowVideoButton from '../generic/buttons/ShowVideoButton';
import InlineTag from './InlineTag';

interface IProps {
	kid: string | undefined;
	scope: 'admin' | 'public';
	plaid?: string;
	criteriaLabel?: string;
	playlistcontentId?: number;
	closeOnPublic?: () => void;
	changeView?: (view: View, tagType?: number, searchValue?: string, searchCriteria?: 'year' | 'tag') => void;
	karoulette?: {
		next(accepted: boolean): void;
		accepted: number;
		refused: number;
		timeRemaining: number;
	};
}

export default function KaraDetail(props: IProps) {
	const context = useContext(GlobalContext);
	const [kara, setKara] = useState<DBPLCInfo>();
	const [showVideo, setShowVideo] = useState(false);
	const [lyrics, setLyrics] = useState<string[]>([]);
	const [pending, setPending] = useState(false);

	const keyObserverHandler = (e: KeyboardEvent) => {
		if (e.key === 'Escape' && !document.getElementById('video')) {
			closeModalWithContext();
		}
	};

	const setBg = () => {
		if (props.scope === 'admin') {
			return;
		}
		const generated = kara ? `url('${getPreviewLink(kara)}')` : 'none';
		if (generated !== context.globalState.frontendContext.backgroundImg) {
			setBgImage(context.globalDispatch, generated);
		}
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const onClickOutsideModal = (e: MouseEvent) => {
		if (!(e.target as Element).closest('.modal-dialog')) {
			closeModalWithContext();
		}
	};

	const getKaraDetail = async (kid?: string) => {
		try {
			let url: string;
			let data: { plaid?: string; plc_id?: number; kid?: string };
			if (props.plaid && !isNonStandardPlaylist(props.plaid)) {
				url = 'getPLC';
				data = { plaid: props.plaid, plc_id: props.playlistcontentId };
			} else {
				url = 'getKara';
				data = { kid: kid ? kid : props.kid };
			}
			const karaGet = await commandBackend(url, data);
			setKara(karaGet);
		} catch (err) {
			closeModalWithContext();
		}
	};

	const getLastPlayed = (lastPlayed_at: Date, lastPlayed: lastplayed_ago) => {
		if (lastPlayed && !lastPlayed.days && !lastPlayed.months && !lastPlayed.years) {
			const timeAgo =
				(lastPlayed.seconds ? lastPlayed.seconds : 0) +
				(lastPlayed.minutes ? lastPlayed.minutes * 60 : 0) +
				(lastPlayed.hours ? lastPlayed.hours * 3600 : 0);
			const timeAgoStr =
				lastPlayed.minutes || lastPlayed.hours
					? secondsTimeSpanToHMS(timeAgo, 'hm')
					: secondsTimeSpanToHMS(timeAgo, 'ms');

			return i18next.t('KARA_DETAIL.LAST_PLAYED_2', { time: timeAgoStr });
		} else if (lastPlayed_at) {
			return i18next.t('KARA_DETAIL.LAST_PLAYED', { date: new Date(lastPlayed_at).toLocaleDateString() });
		}
		return null;
	};

	const fetchLyrics = async () => {
		try {
			let response = await commandBackend('getKaraLyrics', { kid: kara.kid });
			if (response?.length > 0) {
				response = formatLyrics(response);
			}
			setLyrics(response?.map((value) => value.text) || []);
		} catch (e) {
			// already display
		}
	};

	const addKara = async () => {
		const response = await commandBackend('addKaraToPublicPlaylist', {
			requestedby: context.globalState.auth.data.username,
			kids: [kara.kid],
		});
		if (response && response.code && response.data?.plc) {
			let message;
			if (response.data?.plc.time_before_play) {
				const playTime = new Date(Date.now() + response.data.plc.time_before_play * 1000);
				const playTimeDate = playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2);
				const beforePlayTime = secondsTimeSpanToHMS(response.data.plc.time_before_play, 'hm');
				message = (
					<>
						{i18next.t(`SUCCESS_CODES.${response.code}`, {
							song: getTitleInLocale(context.globalState.settings.data, kara.titles),
						})}
						<br />
						{i18next.t('KARA_DETAIL.TIME_BEFORE_PLAY', {
							time: beforePlayTime,
							date: playTimeDate,
						})}
					</>
				);
			} else {
				message = (
					<>
						{i18next.t(`SUCCESS_CODES.${response.code}`, {
							song: getTitleInLocale(context.globalState.settings.data, kara.titles),
						})}
					</>
				);
			}
			displayMessage(
				'success',
				<div className="toast-with-img">
					<picture>
						<source type="image/webp" srcSet={nanamiSingWebP} />
						<source type="image/png" srcSet={nanamiSingPng} />
						<img src={nanamiSingPng} alt="Nanami is singing!" />
					</picture>
					<span>
						{message}
						<br />
						<button
							className="btn"
							onClick={(e) => {
								e.preventDefault();
								e.stopPropagation();
								commandBackend('deleteKaraFromPlaylist', { plc_ids: [response.data.plc.plcid] })
									.then(() => {
										toast.dismiss(response.data.plc.plcid);
										displayMessage('success', i18next.t('SUCCESS_CODES.KARA_DELETED'));
									})
									.catch(() => {
										toast.dismiss(response.data.plc.plcid);
									});
							}}
						>
							{i18next.t('CANCEL')}
						</button>
					</span>
				</div>,
				10000,
				'top-left',
				response.data.plc.plcid
			);
		}
	};

	const downloadMedia = () => {
		const downloadObject: KaraDownloadRequest = {
			mediafile: kara.mediafile,
			kid: kara.kid,
			size: kara.mediasize,
			name: buildKaraTitle(context.globalState.settings.data, kara, true) as string,
			repository: kara.repository,
		};
		commandBackend('addDownloads', { downloads: [downloadObject] }).catch(() => {});
	};

	const placeHeader = (headerEl: ReactNode) => createPortal(headerEl, document.getElementById('menu-supp-root'));

	useDeferredEffect(() => {
		setBg();
		if (kara?.subfile) fetchLyrics();
	}, [kara]);

	useEffect(() => {
		if (props.scope === 'admin' && !is_touch_device()) document.addEventListener('keyup', keyObserverHandler);
		setBg();
		return () => {
			if (props.scope === 'admin' && !is_touch_device())
				document.removeEventListener('keyup', keyObserverHandler);
			if (props.scope === 'public') setBgImage(context.globalDispatch, 'none');
		};
	}, []);

	useEffect(() => {
		if (props.kid) {
			setShowVideo(false);
			setPending(false);
			getKaraDetail();
		}
	}, [props.kid]);

	const karoulette_submit = (accepted: boolean) => {
		setPending(true);
		props.karoulette.next(accepted);
	};

	if (kara) {
		const [karaTags, karaBlockTags] = computeTagsElements(kara, props.scope, props.changeView);

		const playTime = kara.time_before_play > 0 ? new Date(Date.now() + kara.time_before_play * 1000) : null;
		const details = (
			<>
				{props.criteriaLabel ? (
					<div className="detailsKaraLine">
						<span>
							<i className="fas fa-fw fa-ban" />
							{props.criteriaLabel}
						</span>
					</div>
				) : null}
				<div className="detailsKaraLine timeData">
					<span>
						<i className="fas fa-fw fa-clock" />
						{secondsTimeSpanToHMS(kara.duration, 'mm:ss')}
					</span>
					<span>
						{playTime
							? i18next.t('KARA_DETAIL.PLAYING_IN', {
									time: secondsTimeSpanToHMS(kara.time_before_play, 'hm'),
									date: playTime.getHours() + 'h' + ('0' + playTime.getMinutes()).slice(-2),
							  })
							: kara.lastplayed_ago
							? getLastPlayed(kara.lastplayed_at, kara.lastplayed_ago)
							: ''}
					</span>
				</div>
				{kara.upvotes && props.scope === 'admin' ? (
					<div className="detailsKaraLine">
						<span title={i18next.t('KARA_DETAIL.UPVOTE_NUMBER')}>
							<i className="fas fa-thumbs-up" />
							{kara.upvotes}
						</span>
					</div>
				) : null}
				<div className="detailsKaraLine">
					<span>
						{props.playlistcontentId ? i18next.t('KARA_DETAIL.ADDED') : i18next.t('KARA_DETAIL.CREATED')}
						{kara.created_at ? (
							<>
								{i18next.t('KARA_DETAIL.ADDED_2')}
								<span className="boldDetails">{new Date(kara.created_at).toLocaleString()}</span>
							</>
						) : null}
						{kara.nickname ? (
							<>
								{i18next.t('KARA_DETAIL.ADDED_3')}
								<span className="boldDetails">{kara.nickname}</span>
							</>
						) : null}
					</span>
				</div>
				{karaBlockTags}
				<div className="detailsKaraLine">
					<span className="boldDetails">
						<i className={`fas fa-fw fa-${YEARS.icon}`} />
						{kara.year}
					</span>
				</div>
			</>
		);

		const addKaraButton = (
			<button type="button" onClick={addKara} className="btn btn-action">
				<i className="fas fa-fw fa-plus" />
				<span>{i18next.t('TOOLTIP_ADDKARA')}</span>
			</button>
		);

		const makeFavButton = <MakeFavButton kid={kara.kid} />;

		const showVideoButton = (
			<ShowVideoButton
				togglePreview={() => setShowVideo(!showVideo)}
				preview={showVideo}
				repository={kara.repository}
			/>
		);

		const downloadVideoButton =
			kara.download_status !== 'MISSING' ? null : (
				<button type="button" className="btn btn-action" onClick={downloadMedia}>
					<i className="fas fa-fw fa-file-download" />
					<span>{i18next.t('KARA_DETAIL.DOWNLOAD_MEDIA')}</span>
				</button>
			);

		const modifyKaraokeButton = context.globalState.settings.data.config?.System?.Repositories.filter(
			(value) => value.Name === kara.repository
		)[0].MaintainerMode ? (
			<a href={`/system/karas/${kara.kid}`}>
				<button type="button" className="btn btn-action">
					<i className="fas fa-fw fa-edit" />
					<span>{i18next.t('KARA_DETAIL.MODIFY_KARAOKE')}</span>
				</button>
			</a>
		) : null;

		const video = showVideo ? (
			<video
				src={
					isRemote() || kara.download_status !== 'DOWNLOADED'
						? `https://${kara.repository}/downloads/medias/${kara.mediafile}`
						: `/medias/${kara.mediafile}`
				}
				controls={true}
				autoPlay={true}
				loop={true}
				playsInline={true}
				onLoadStart={(e) => (e.currentTarget.volume = 0.5)}
				className={`modal-video${props.scope === 'public' ? ' public' : ''}`}
			/>
		) : null;

		const lyricsKara = kara.subfile ? (
			<div className="lyricsKara detailsKaraLine">
				{lyrics?.length > 0 ? (
					<div className="boldDetails">
						<i className="fas fa-fw fa-closed-captioning" />
						{i18next.t('KARA_DETAIL.LYRICS')}
					</div>
				) : null}
				{kara.subfile &&
					lyrics?.map((ligne, index) => {
						return (
							<Fragment key={index}>
								{ligne}
								<br />
							</Fragment>
						);
					})}
			</div>
		) : null;

		const header = (
			<div
				className={`modal-header img-background${props.scope === 'public' ? ' fixed' : ''}`}
				style={{ ['--img' as any]: props.scope === 'admin' ? `url('${getPreviewLink(kara)}')` : 'none' }}
			>
				<div className="modal-header-title">
					{props.scope === 'public' ? (
						<button className="transparent-btn" type="button" onClick={props.closeOnPublic}>
							<i className="fas fa-fw fa-arrow-left" />
						</button>
					) : null}
					<div className="modal-title-block">
						<h4 className="modal-title">
							{getTitleInLocale(context.globalState.settings.data, kara.titles)}
						</h4>
						<h5 className="modal-series">
							<InlineTag
								tag={kara.series[0] || kara.singers[0]}
								scope={props.scope}
								changeView={props.changeView}
								tagType={kara.series[0] ? 1 : 2}
							/>
						</h5>
					</div>
					{props.scope === 'admin' ? (
						<button className="transparent-btn" type="button" onClick={closeModalWithContext}>
							<i className="fas fa-fw fa-times" />
						</button>
					) : null}
				</div>
				<div className="tagConteneur">{karaTags}</div>
				{props.karoulette ? (
					<div className="karoulette">
						<button className="btn btn-action" disabled={pending} onClick={() => karoulette_submit(false)}>
							<i className="fas fa-fw fa-times" />
							{i18next.t('KAROULETTE.REFUSE')}
						</button>
						<p>
							{i18next.t('KAROULETTE.STATS', {
								count: props.karoulette.accepted + props.karoulette.refused,
								accepted: i18next.t('KAROULETTE.ACCEPTED', { count: props.karoulette.accepted }),
								refused: i18next.t('KAROULETTE.REFUSED', { count: props.karoulette.refused }),
							})}
							<br />
							{i18next.t('KAROULETTE.PLAYLIST_REMAINING', {
								count: Math.floor(props.karoulette.timeRemaining / 60),
							})}
						</p>
						<button className="btn btn-action" disabled={pending} onClick={() => karoulette_submit(true)}>
							<i className="fas fa-fw fa-check" />
							{i18next.t('KAROULETTE.ACCEPT')}
						</button>
					</div>
				) : null}
			</div>
		);

		let infoKaraTemp;
		if (props.scope === 'admin') {
			infoKaraTemp = (
				<div className="modal modalPage" onClick={onClickOutsideModal}>
					<div className="modal-dialog">
						<div className="modal-content detailsKara">
							{header}
							<div className="detailsKara">
								<div className="centerButtons">
									{makeFavButton}
									{showVideoButton}
									{downloadVideoButton}
									{modifyKaraokeButton}
								</div>
								{video}
								{details}
								{lyricsKara}
							</div>
						</div>
					</div>
				</div>
			);
		} else {
			infoKaraTemp = (
				<>
					{placeHeader(header)}
					<div className="detailsKara">
						<div className="centerButtons">
							{context.globalState.auth.data.role === 'guest' ? null : makeFavButton}
							{props.scope === 'public' &&
							context?.globalState.settings.data.config?.Frontend?.Mode === 2 &&
							props.plaid !== context.globalState.settings.data.state.publicPlaid &&
							props.plaid !== context.globalState.settings.data.state.currentPlaid &&
							(!kara?.public_plc_id || !kara?.public_plc_id[0])
								? addKaraButton
								: null}
							{showVideoButton}
						</div>
						{video}
						{details}
						{lyricsKara}
					</div>
				</>
			);
		}
		return infoKaraTemp;
	} else {
		return null;
	}
}
