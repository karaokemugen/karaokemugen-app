import './VersionSelector.scss';

import i18next from 'i18next';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { KaraList } from '../../../../../src/lib/types/kara';
import GlobalContext from '../../../store/context';
import {
	computeTagsElements,
	getPreviewLink,
	getTagInLocale,
	getTitleInLocale,
	sortAndHideTags,
} from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { YEARS } from '../../../utils/tagTypes';
import { PLCCallback, secondsTimeSpanToHMS } from '../../../utils/tools';
import MakeFavButton from '../generic/buttons/MakeFavButton';
import ShowVideoButton from '../generic/buttons/ShowVideoButton';
import InlineTag from './InlineTag';
import AddKaraButton from '../generic/buttons/AddKaraButton';
import VideoPreview from '../generic/VideoPreview';

interface Props {
	kid: string;
	scope: 'admin' | 'public';
}

async function fetchKaras(kid) {
	const karaParent: DBKara = await commandBackend('getKara', { kid });
	const karaChildren: KaraList = await commandBackend('getKaras', {
		q: `k:${karaParent.children.join(',')}`,
	});
	return { karas: [karaParent, ...karaChildren.content], i18n: karaChildren.i18n };
}

export default function VersionSelector(props: Props) {
	const [karas, setKaras] = useState<DBKara[]>();
	const [i18n, setI18n] = useState<KaraList['i18n']>();
	const [indexOpened, setIndexOpened] = useState(-1);
	const [showVideo, setShowVideo] = useState(false);
	const context = useContext(GlobalContext);
	const navigate = useNavigate();
	const { kid: id } = useParams();

	const openKara = useCallback(index => {
		setIndexOpened(oldIndex => {
			if (oldIndex === index) return -1;
			else return index;
		});
		setShowVideo(false);
	}, []);

	const addKara = async (e, kara) => {
		try {
			e.stopPropagation();
			const res = await commandBackend('addKaraToPublicPlaylist', {
				requestedby: context.globalState.auth.data.username,
				kids: [kara.kid],
			});
			PLCCallback(res, context, kara);
		} catch (e) {
			// already display
		}
	};

	const getKaras = useCallback(
		() =>
			fetchKaras(id).then(res => {
				setI18n(res.i18n);
				setKaras(res.karas);
			}),
		[id]
	);

	useEffect(() => {
		const refreshKaras = updated => {
			for (const k of updated) {
				if (karas?.findIndex(dbk => dbk.kid === k.kid) !== -1) {
					getKaras();
					break;
				}
			}
		};

		getSocket().on('KIDUpdated', refreshKaras);
		return () => {
			getSocket().off('KIDUpdated', refreshKaras);
		};
	}, [getKaras, karas]);

	useEffect(() => {
		getKaras();
	}, [getKaras]);

	return (
		<div>
			{karas ? (
				<div className="modal-content">
					<div className="modal-header public-modal">
						<button className="closeModal" type="button" onClick={() => navigate(-1)}>
							<i className="fas fa-arrow-left" />
						</button>
						<h4 className="modal-title">
							{getTitleInLocale(
								context.globalState.settings.data,
								karas[0].titles,
								karas[0].titles_default_language
							)}
						</h4>
					</div>
					<div className="modal-body">
						<p>{i18next.t('PUBLIC_HOMEPAGE.KARA_VERSIONS', { length: karas.length })}</p>
						<div className={`song-list${indexOpened >= 0 ? ' open' : ''}`}>
							{karas.map((kara, index) => {
								const tagsScope = index === indexOpened ? props.scope : 'admin';
								const [karaTags, karaBlockTags] = computeTagsElements(kara, tagsScope, false, i18n);

								return (
									<div key={kara.kid} className={`song${index === indexOpened ? ' open' : ''}`}>
										<div
											style={{ ['--img' as any]: `url('${getPreviewLink(kara)}')` }}
											className="modal-header img-background"
											onClick={() => openKara(index)}
										>
											<div className="modal-header-title">
												<button className="transparent-btn">
													<i className="fas fa-chevron-right" />
												</button>
												<div className="modal-title-block">
													<h4 className="modal-title">
														{getTitleInLocale(
															context.globalState.settings.data,
															kara.titles,
															kara.titles_default_language
														)}
														{sortAndHideTags(kara.versions, 'public').map(t => (
															<span className="tag white inline" key={t.tid}>
																{getTagInLocale(
																	context?.globalState.settings.data,
																	t,
																	i18n
																)}
															</span>
														))}
													</h4>
													<h5 className="modal-series">
														<InlineTag
															tag={
																kara.series[0] ||
																kara.singergroups[0] ||
																kara.singers[0]
															}
															scope={tagsScope}
															tagType={kara.series[0] ? 1 : 2}
															i18nParam={i18n}
														/>
													</h5>
												</div>
												<div className="buttons">
													{kara.my_public_plc_id.length > 0 ? (
														<button
															onClick={e => {
																e.stopPropagation();
																commandBackend('deleteKaraFromPlaylist', {
																	plc_ids: kara.my_public_plc_id,
																});
															}}
															className="btn btn-danger"
														>
															<i className="fas fa-eraser" />
														</button>
													) : (
														<button onClick={e => addKara(e, kara)} className="btn">
															<i className="fas fa-plus" />
														</button>
													)}
												</div>
											</div>
											<div className="tagConteneur">{karaTags}</div>
										</div>
										<div className="detailsKara">
											<div className="centerButtons">
												{context.globalState.auth.data.role === 'guest' ? null : (
													<MakeFavButton kid={kara.kid} />
												)}
												{!kara?.public_plc_id || !kara?.public_plc_id[0] ? (
													<AddKaraButton kara={kara} />
												) : null}
												<ShowVideoButton
													togglePreview={() => setShowVideo(!showVideo)}
													preview={showVideo}
													repository={kara.repository}
												/>
											</div>
											<VideoPreview
												kara={kara}
												show={showVideo && indexOpened === index}
												scope={props.scope}
											/>
											<div className="detailsKaraLine timeData">
												<span>
													<i className="fas fa-fw fa-clock" />
													{secondsTimeSpanToHMS(kara.duration, 'mm:ss')}
												</span>
											</div>
											{karaBlockTags}
											<div className="detailsKaraLine">
												<span className="boldDetails">
													<i className={`fas fa-fw fa-${YEARS.icon}`} />
													{kara.year}
												</span>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>
			) : (
				<div className="modal-content">
					<div className="loader" />
				</div>
			)}
		</div>
	);
}
