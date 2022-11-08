import './KaraDetail.scss';

import i18next from 'i18next';
import { Fragment, MouseEvent, ReactNode, useContext, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'react-router-dom';

import { lastplayed_ago } from '../../../../../src/lib/types/database/kara';
import { DBPLCInfo } from '../../../../../src/types/database/playlist';
import { KaraDownloadRequest } from '../../../../../src/types/download';
import { setBgImage } from '../../../store/actions/frontendContext';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import ProfilePicture from '../../../utils/components/ProfilePicture';
import { useDeferredEffect } from '../../../utils/hooks';
import {
	buildKaraTitle,
	computeTagsElements,
	formatLyrics,
	getPreviewLink,
	getTitleInLocale,
} from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { YEARS } from '../../../utils/tagTypes';
import { is_touch_device, secondsTimeSpanToHMS } from '../../../utils/tools';
import MakeFavButton from '../generic/buttons/MakeFavButton';
import ShowVideoButton from '../generic/buttons/ShowVideoButton';
import InlineTag from './InlineTag';
import AddKaraButton from '../generic/buttons/AddKaraButton';
import VideoPreview from '../generic/VideoPreview';

interface IProps {
	kid?: string;
	scope: 'admin' | 'public';
	criteriaLabel?: string;
	playlistcontentId?: number;
	closeOnPublic?: () => void;
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
	const params = useParams();
	const id = props.kid ? props.kid : params.kid;
	const plc_id = props.playlistcontentId ? props.playlistcontentId : Number(params.plcid);

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
			let data: { plc_id?: number; kid?: string };
			if (plc_id) {
				url = 'getPLC';
				data = { plc_id: plc_id };
			} else {
				url = 'getKara';
				data = { kid: kid ? kid : id };
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
			setLyrics(response?.map(value => value.text) || []);
		} catch (e) {
			// already display
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
		if (id) {
			setShowVideo(false);
			setPending(false);
			getKaraDetail();
		}
	}, [id]);

	useEffect(() => {
		if (plc_id) {
			setShowVideo(false);
			setPending(false);
			getKaraDetail();
		}
	}, [plc_id]);

	useEffect(() => {
		const refreshKaras = updated => {
			for (const k of updated) {
				if (id === k.kid) {
					getKaraDetail();
					break;
				}
			}
		};

		getSocket().on('KIDUpdated', refreshKaras);
		return () => {
			getSocket().off('KIDUpdated', refreshKaras);
		};
	}, [id]);

	const karoulette_submit = (accepted: boolean) => {
		setPending(true);
		props.karoulette.next(accepted);
	};

	if (kara) {
		const [karaTags, karaBlockTags] = computeTagsElements(kara, props.scope);

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
				{plc_id ? (
					<div className="detailsKaraLine">
						{kara.nickname ? (
							<ProfilePicture
								className="img-circle"
								user={{
									login: kara.username,
									type: kara.user_type,
									nickname: kara.nickname,
								}}
							/>
						) : null}
						<div>
							{i18next.t('KARA_DETAIL.ADDED')}
							{kara.added_at ? (
								<>
									{i18next.t('KARA_DETAIL.ADDED_2')}
									<span className="boldDetails">{new Date(kara.added_at).toLocaleString()}</span>
								</>
							) : null}
							{kara.nickname ? (
								<>
									{i18next.t('KARA_DETAIL.ADDED_3')}
									<span className="boldDetails">{kara.nickname}</span>
								</>
							) : null}
						</div>
					</div>
				) : null}
				<div className="detailsKaraLine">
					<div>
						{i18next.t('KARA_DETAIL.CREATED')}
						{kara.created_at ? (
							<>
								{i18next.t('KARA_DETAIL.ADDED_2')}
								<span className="boldDetails">{new Date(kara.created_at).toLocaleString()}</span>
							</>
						) : null}
					</div>
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

		const addKaraButton = <AddKaraButton kara={kara} />;

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

		const modifyKaraokeButton = context.globalState.settings.data.config?.System?.Repositories?.filter(
			value => value.Name === kara.repository
		)[0].MaintainerMode ? (
			<a href={`/system/karas/${kara.kid}`}>
				<button type="button" className="btn btn-action">
					<i className="fas fa-fw fa-edit" />
					<span>{i18next.t('KARA_DETAIL.MODIFY_KARAOKE')}</span>
				</button>
			</a>
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
							{getTitleInLocale(
								context.globalState.settings.data,
								kara.titles,
								kara.titles_default_language
							)}
						</h4>
						<h5 className="modal-series">
							<InlineTag
								tag={kara.series[0] || kara.singergroups[0] || kara.singers[0]}
								scope={props.scope}
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
								<VideoPreview kara={kara} show={showVideo} scope={props.scope} />
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
							kara.plaid !== context.globalState.settings.data.state.publicPlaid &&
							kara.plaid !== context.globalState.settings.data.state.currentPlaid &&
							(!kara?.public_plc_id || !kara?.public_plc_id[0])
								? addKaraButton
								: null}
							{showVideoButton}
						</div>
						<VideoPreview kara={kara} show={showVideo} scope={props.scope} />
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
