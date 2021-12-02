import './VersionSelector.scss';

import { useCallback, useContext, useEffect, useState } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { KaraList } from '../../../../../src/lib/types/kara';
import GlobalContext from '../../../store/context';
import {
	computeTagsElements,
	getPreviewLink,
	getTagInLocale,
	getTitleInLocale,
	sortTagByPriority
} from '../../../utils/kara';
import { commandBackend, getSocket, isRemote } from '../../../utils/socket';
import { YEARS } from '../../../utils/tagTypes';
import { PLCCallback, secondsTimeSpanToHMS } from '../../../utils/tools';
import { View } from '../../types/view';
import MakeFavButton from '../generic/buttons/MakeFavButton';
import ShowVideoButton from '../generic/buttons/ShowVideoButton';
import ActionsButtons from './ActionsButtons';
import InlineTag from './InlineTag';

interface Props {
	kid: string
	closeOnPublic: () => void
	scope: 'admin' | 'public'
	changeView?: (view: View, tagType?: number, searchValue?: string, searchCriteria?: 'year' | 'tag') => void;
}

async function fetchKaras(kid) {
	const karaParent: DBKara = await commandBackend('getKara', {kid});
	const karaChildren: KaraList = await commandBackend('getKaras', {
		q: `k:${karaParent.children.join(',')}`
	});
	return {karas: [karaParent, ...karaChildren.content], i18n: karaChildren.i18n};
}

export default function VersionSelector(props: Props) {
	const [karas, setKaras] = useState<DBKara[]>();
	const [i18n, setI18n] = useState<KaraList['i18n']>();
	const [indexOpened, setIndexOpened] = useState(-1);
	const [showVideo, setShowVideo] = useState(false);
	const context = useContext(GlobalContext);

	const openKara = useCallback((index) => {
		setIndexOpened(oldIndex => {
			if (oldIndex === index) return -1;
			else return index;
		});
		setShowVideo(false);
	}, []);

	const refreshKaras = useCallback((updated) => {
		for (const k of updated) {
			if (karas.findIndex(dbk => dbk.kid === k.kid) !== -1) {
				fetchKaras(props.kid).then(res => {
					setI18n(res.i18n);
					setKaras(res.karas);
				});
				break;
			}
		}
	}, [karas]);

	useEffect(() => {
		getSocket().on('KIDUpdated', refreshKaras);
		return () => {
			getSocket().off('KIDUpdated', refreshKaras);
		};
	}, [karas]);

	useEffect(() => {
		fetchKaras(props.kid).then(res => {
			setI18n(res.i18n);
			setKaras(res.karas);
		});
	}, [props.kid]);

	return (<div>
		{karas ? <div className="modal-content">
			<div className="modal-header public-modal">
				<button className="closeModal" type="button" onClick={props.closeOnPublic}>
					<i className="fas fa-arrow-left" />
				</button>
				<h4 className="modal-title">
					{getTitleInLocale(context.globalState.settings.data, karas[0].titles)}
				</h4>
			</div>
			<div className="modal-body">
				<p>Cette chanson est disponible en {karas.length} versions, choisissez celle que vous voulez et ajoutez-là à la playlist ou à vos favoris.</p>
				<div className={`song-list${indexOpened >= 0 ? ' open':''}`}>
					{karas.map((kara, index) => {
						const tagsScope = index === indexOpened ? props.scope : 'admin';
						const [karaTags, karaBlockTags] = computeTagsElements(kara, tagsScope, props.changeView, false, i18n);

						return (<div key={kara.kid} className={`song${index === indexOpened ? ' open':''}`}>
							<div style={{['--img' as any]: `url('${getPreviewLink(kara)}')`}} className="modal-header img-background"
								 onClick={() => openKara(index)}>
								<div className="modal-header-title">
									<button className="transparent-btn">
										<i className="fas fa-chevron-right" />
									</button>
									<div className="modal-title-block">
										<h4 className="modal-title">
											{getTitleInLocale(context.globalState.settings.data, kara.titles)}
											{kara.versions?.sort(sortTagByPriority).map((t) => (
												<span className="tag white inline" key={t.tid}>
													{getTagInLocale(context?.globalState.settings.data, t, i18n)}
												</span>
											))}
										</h4>
										<h5 className="modal-series">
											<InlineTag tag={kara.series[0] || kara.singers[0]}
													   scope={tagsScope}
													   changeView={props.changeView}
													   tagType={kara.series[0] ? 1 : 2} />
										</h5>
									</div>
									<div className='buttons'>
										{(kara.my_public_plc_id.length > 0) ?
											<button onClick={e => {
												e.stopPropagation();
												commandBackend('deleteKaraFromPlaylist', {
													plc_ids: kara.my_public_plc_id
												});
											}} className="btn btn-danger">
												<i className="fas fa-eraser" />
											</button>:<button onClick={async e => {
												e.stopPropagation();
												const res = await commandBackend('addKaraToPublicPlaylist', {
													requestedby: context.globalState.auth.data.username,
													kids: [kara.kid],
												});
												PLCCallback(res, context, kara);
											}} className="btn btn-primary">
												<i className="fas fa-plus" />
											</button>
										}

									</div>
								</div>
								<div className="tagConteneur">
									{karaTags}
								</div>
							</div>
							<div className="detailsKara">
								<div className="centerButtons">
									<MakeFavButton kid={kara.kid} />
									<ShowVideoButton togglePreview={() => setShowVideo(!showVideo)} preview={showVideo} repository={kara.repository} />
								</div>
								{(showVideo && indexOpened === index) ? (
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
										className={`modal-video${props.scope === 'public' ? ' public' : ''}`} />
								) : null}
								<div className="detailsKaraLine timeData">
									<span>
										<i className="fas fa-fw fa-clock"/>
										{secondsTimeSpanToHMS(kara.duration, 'mm:ss')}
									</span>
								</div>
								{karaBlockTags}
								<div className="detailsKaraLine">
									<span className="boldDetails">
										<i className={`fas fa-fw fa-${YEARS.icon}`}/>
										{kara.year}
									</span>
								</div>
							</div>
						</div>);
					})}
				</div>
			</div>
		</div>:<div className="modal-content">
			<div className="loader" />
		</div>}
	</div>);
}
