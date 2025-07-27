import './KaraList.scss';

import { MouseEvent as ReactMouseEvent, useCallback, useContext, useState } from 'react';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { KaraList as IKaraList } from '../../../../../src/lib/types/kara';
import GlobalContext from '../../../store/context';
import {
	computeTagsElements,
	getPreviewLink,
	getTagInLocale,
	getTitleInLocale,
	sortAndHideTags,
} from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { YEARS } from '../../../utils/tagTypes';
import { secondsTimeSpanToHMS } from '../../../utils/tools';
import AddKaraButton from '../generic/buttons/AddKaraButton';
import MakeFavButton from '../generic/buttons/MakeFavButton';
import ShowVideoButton from '../generic/buttons/ShowVideoButton';
import UpvoteKaraButton from '../generic/buttons/UpvoteKaraButton';
import VideoPreview from '../generic/VideoPreview';
import InlineTag from './InlineTag';
import { WS_CMD } from '../../../utils/ws';

interface KaraListProps {
	karas: IKaraList;
	scope: 'admin' | 'public';
	addKara?: ((e: ReactMouseEvent<HTMLButtonElement, MouseEvent>, kid: DBKara) => void) | false;
}

function KaraList({ karas, scope, addKara = false }: KaraListProps) {
	const [kidOpened, setKidOpened] = useState('');
	const [showVideo, setShowVideo] = useState(false);
	const context = useContext(GlobalContext);

	const openKara = useCallback(index => {
		setKidOpened(oldIndex => {
			if (oldIndex === index) return '';
			else return index;
		});
		setShowVideo(false);
	}, []);

	return (
		<div className={`song-list${kidOpened ? ' open' : ''}`}>
			{karas.content.map(kara => {
				if (!kara) return undefined;
				const tagsScope = kara.kid === kidOpened ? scope : 'admin';
				const [karaTags, karaBlockTags] = computeTagsElements(kara, tagsScope, context.globalState.settings.data, false, karas.i18n);

				return (
					<div key={kara.kid} className={`song${kara.kid === kidOpened ? ' open' : ''}`}>
						<div
							style={{ ['--img' as string]: `url('${getPreviewLink(kara, context)}')` }}
							className="modal-header img-background"
							onClick={() => openKara(kara.kid)}
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
												{getTagInLocale(context?.globalState.settings.data, t, karas.i18n).i18n}
											</span>
										))}
									</h4>
									<h5 className="modal-series">
										<InlineTag
											tag={kara.series[0] || kara.singergroups[0] || kara.singers[0]}
											scope={tagsScope}
											tagType={kara.series[0] ? 1 : 2}
											i18nParam={karas.i18n}
										/>
									</h5>
								</div>
								<div className="modal-right">
									<h6>
										<span>
											<i className={`fas fa-fw fa-${YEARS.icon}`} />
											{kara.year}
										</span>
									</h6>

									<h6>
										<span>
											<i className="fas fa-fw fa-clock" />
											{secondsTimeSpanToHMS(kara.duration, 'mm:ss')}
										</span>
									</h6>
								</div>
								{addKara && context?.globalState.settings.data.config?.Frontend?.Mode === 2 ? (
									<div className="buttons">
										{kara.my_public_plc_id.length > 0 ? (
											<button
												onClick={e => {
													e.stopPropagation();
													commandBackend(WS_CMD.DELETE_KARA_FROM_PLAYLIST, {
														plc_ids: kara.my_public_plc_id,
													});
												}}
												className="btn btn-danger"
											>
												<i className="fas fa-eraser" />
											</button>
										) : kara?.public_plc_id.length === 0 ||
										  context.globalState.settings.data.config.Playlist.AllowPublicDuplicates ===
												'allowed' ? (
											<button onClick={e => addKara(e, kara)} className="btn">
												<i className="fas fa-plus" />
											</button>
										) : context.globalState.settings.data.config.Playlist.AllowPublicDuplicates ===
										  'upvotes' ? (
											<UpvoteKaraButton kara={kara} />
										) : null}
									</div>
								) : null}
							</div>
							<div className="tagConteneur">{karaTags}</div>
						</div>
						<div className="detailsKara">
							<div className="centerButtons">
								{context.globalState.auth.data.role === 'guest' ? null : (
									<MakeFavButton kid={kara.kid} />
								)}
								{kara?.public_plc_id.length === 0 &&
								context?.globalState.settings.data.config?.Frontend?.Mode === 2 ? (
									<AddKaraButton kara={kara} scope={scope} />
								) : null}
								<ShowVideoButton
									togglePreview={() => setShowVideo(!showVideo)}
									preview={showVideo}
									repository={kara.repository}
								/>
							</div>
							<VideoPreview kara={kara} show={showVideo && kidOpened === kara.kid} scope={scope} />
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
	);
}

export default KaraList;
