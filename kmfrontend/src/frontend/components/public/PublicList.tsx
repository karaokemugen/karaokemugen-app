import i18next from 'i18next';
import { debounce } from 'lodash';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { setFilterValue, setIndexKaraDetail, setPlaylistInfoLeft } from '../../../store/actions/frontendContext';
import { showModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { nonStandardPlaylists } from '../../../utils/tools';
import { KaraElement } from '../../types/kara';
import KmAppBodyDecorator from '../decorators/KmAppBodyDecorator';
import KmAppHeaderDecorator from '../decorators/KmAppHeaderDecorator';
import Playlist from '../karas/Playlist';
import PollModal from '../modals/PollModal';
import TagsList from './TagsList';

interface Props {
	sort: 'search' | 'recent' | 'requested' | 'incoming'; // Affects basic search, favorites has local sort state
	poll: boolean;
	plaid?: string;
}

export default function PublicList(props: Props) {
	const context = useContext(GlobalContext);
	const navigate = useNavigate();
	const { plaid, tid, year, tagType } = useParams();

	const [favoritesSort, setFavoritesSort] = useState<'search' | 'recent'>('search');
	const [searchFilter, setSearchFilter] = useState(context.globalState.frontendContext.filterValue1);

	const changeFilterValue = useMemo(
		() =>
			debounce(
				e =>
					setFilterValue(
						context.globalDispatch,
						e.target.value,
						'left',
						context.globalState.frontendContext.playlistInfoLeft.plaid
					),
				1000,
				{ leading: true }
			),
		[context.globalState.frontendContext.playlistInfoLeft?.plaid]
	);

	const openKara = (kara: KaraElement, index: number) => {
		setPlaylistInfoLeft(context.globalDispatch, context.globalState.frontendContext.playlistInfoLeft.plaid);
		setIndexKaraDetail(context.globalDispatch, index);
		// Show VersionSelector if user has parents/children enabled, that the kara have children and that it is
		// not a PLC entry.
		if (
			context.globalState.settings.data.user.flag_parentsonly &&
			context.globalState.frontendContext.playlistInfoLeft.plaid !== nonStandardPlaylists.favorites &&
			!kara.plcid &&
			kara.children?.length > 0
		) {
			navigate(`/public/karaokes/${kara.kid}`);
		} else if (kara.plcid) {
			navigate(`/public/plc/${kara.plcid}`);
		} else {
			navigate(`/public/karaoke/${kara.kid}`);
		}
	};

	useEffect(() => {
		if (props.plaid || plaid) {
			setPlaylistInfoLeft(context.globalDispatch, props.plaid || plaid);
		} else {
			setPlaylistInfoLeft(context.globalDispatch, nonStandardPlaylists.library);
		}
	}, [props.plaid, plaid]);

	useEffect(() => {
		setSearchFilter('');
		setFilterValue(context.globalDispatch, '', 'left', context.globalState.frontendContext.playlistInfoLeft.plaid);
	}, [props.plaid, plaid, tid, year, tagType]);

	return (
		<>
			<KmAppHeaderDecorator mode="public">
				<button className="btn" type="button" onClick={() => navigate(-1)}>
					<i className="fas fa-arrow-left" />
				</button>
				<div className="plSearch">
					<input
						placeholder={`\uF002 ${i18next.t('SEARCH')}`}
						type="text"
						value={searchFilter}
						onChange={e => {
							setSearchFilter(e.target.value);
							changeFilterValue(e);
						}}
					/>
					<button
						className="btn"
						onClick={() => {
							setSearchFilter('');
							setFilterValue(
								context.globalDispatch,
								'',
								'left',
								context.globalState.frontendContext.playlistInfoLeft.plaid
							);
						}}
					>
						<i className="fas fa-eraser" />
					</button>
				</div>
				{props.plaid === nonStandardPlaylists.favorites ? (
					<button
						className="btn btn-default"
						onClick={() =>
							setFavoritesSort(ctype => {
								return ctype === 'search' ? 'recent' : 'search';
							})
						}
						title={favoritesSort === 'search' ? i18next.t('VIEW_STANDARD') : i18next.t('VIEW_RECENT')}
					>
						<i className={`fas ${favoritesSort === 'search' ? 'fa-sort-alpha-down' : 'fa-clock'}`} />
					</button>
				) : null}
				{props.poll ? (
					<button
						className="btn btn-default showPoll"
						onClick={() => showModal(context.globalDispatch, <PollModal />)}
					>
						<i className="fas fa-chart-line" />
					</button>
				) : null}
			</KmAppHeaderDecorator>

			<KmAppBodyDecorator
				mode={context?.globalState.settings.data.config?.Frontend?.Mode}
				extraClass="JustPlaylist"
			>
				{parseInt(tagType) >= 0 ? (
					<TagsList />
				) : (
					<Playlist
						scope="public"
						side="left"
						openKara={openKara}
						searchValue={tid || year}
						searchCriteria={tid || year ? (tid ? 'tag' : 'year') : null}
						searchType={props.plaid === nonStandardPlaylists.favorites ? favoritesSort : props.sort}
					/>
				)}
			</KmAppBodyDecorator>
		</>
	);
}
