import './AutoMixModal.scss';

import i18next from 'i18next';
import { MouseEvent, useContext, useMemo, useState } from 'react';

import { User } from '../../../../../src/lib/types/user';
import { AutoMixParams, PlaylistLimit } from '../../../../../src/types/favorites';
import { closeModal } from '../../../store/actions/modal';
import GlobalContext from '../../../store/context';
import { setPlaylistInfo } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { useLocalSearch, useTagSearch } from '../../../utils/hooks';
import Autocomplete, { AutocompleteOption } from '../generic/Autocomplete';
import { ANIMELISTS, FAVORITES, getTagTypeName, tagTypes, YEARS } from '../../../utils/tagTypes';

interface IProps {
	userList: User[];
	side: 'left' | 'right';
}

const mapValues = (el: { value: any }) => el.value;

function AutoMixModal(props: IProps) {
	const context = useContext(GlobalContext);
	const [limitType, setLimitType] = useState<PlaylistLimit>('duration');
	const [limitNumber, setLimitNumber] = useState(0);
	const memoizedUsers = useMemo(() => {
		return props.userList.map(el => {
			return {
				label: el.nickname || el.login,
				value: el.login,
			};
		});
	}, [props.userList]);
	const [userFavoritesList, setUserFavoritesList] = useState([]);
	const [userAnimeList, setUserAnimeList] = useState([]);
	const [tagList, setTagList] = useState([]);
	const [yearList, setYearList] = useState([]);
	const [surprisePlaylist, setSurprisePlaylist] = useState(false);
	const [search, setSearch] = useState<AutocompleteOption>({ value: '', label: '' });
	const [type, setType] = useState('');
	const [criteriaType, setCriteriaType] = useState(1001);
	const [tags, tagSearch] = useTagSearch(criteriaType, context);
	const [playlistName, setPlaylistName] = useState('');
	const users = useLocalSearch(memoizedUsers, type);

	const onClick = async () => {
		if (
			limitNumber === 0 ||
			(userFavoritesList.length === 0 &&
				userAnimeList.length === 0 &&
				tagList.length === 0 &&
				yearList.length === 0)
		)
			return;
		const data: AutoMixParams = {
			filters: {
				usersFavorites: userFavoritesList.length > 0 ? userFavoritesList.map(mapValues) : undefined,
				usersAnimeList: userAnimeList.length > 0 ? userAnimeList.map(mapValues) : undefined,
				years: yearList.length > 0 ? yearList.map(mapValues) : undefined,
				tags: tagList.length > 0 ? tagList.map(mapValues) : undefined,
			},
			limitType,
			limitNumber,
			playlistName: playlistName === '' ? undefined : playlistName,
			surprisePlaylist: surprisePlaylist,
		};
		try {
			const res = await commandBackend('createAutomix', data);
			if (!data.surprisePlaylist) setPlaylistInfo(props.side, context, res.plaid);
		} catch (e) {
			// already display
		}
		closeModalWithContext();
	};

	const closeModalWithContext = () => closeModal(context.globalDispatch);

	const onClickOutsideModal = (e: MouseEvent) => {
		const el = document.getElementsByClassName('modal-dialog')[0];
		if (
			!el.contains(e.target as Node) &&
			userFavoritesList.length === 0 &&
			userAnimeList.length === 0 &&
			tagList.length === 0 &&
			yearList.length === 0
		) {
			closeModalWithContext();
		}
	};

	const addCriterion = () => {
		if (search.value === '') return;
		if (criteriaType === 1001) {
			setUserFavoritesList([...userFavoritesList, search]);
		} else if (criteriaType === 1002) {
			setUserAnimeList([...userAnimeList, search]);
		} else if (criteriaType === 0) {
			setYearList([
				...yearList,
				{
					label: search.value.toString(),
					value: Number(search.value),
				},
			]);
		} else {
			setTagList([
				...tagList,
				{
					label: search.label,
					value: {
						tid: search.value,
						type: criteriaType,
					},
				},
			]);
		}
		setSearch({ value: '', label: '' });
		setType('');
		if (criteriaType !== 1001) tagSearch('', criteriaType);
	};

	const deleteCriterion = (type: 'favorites' | 'animelist' | 'year' | 'tag', value: any) => {
		switch (type) {
			case 'favorites':
				setUserFavoritesList(userFavoritesList.filter(u => u.value !== value));
				break;
			case 'animelist':
				setUserAnimeList(userAnimeList.filter(u => u.value !== value));
				break;
			case 'year':
				setYearList(yearList.filter(y => y.value !== value));
				break;
			case 'tag':
				setTagList(tagList.filter(t => !(t.value.tid !== value.tid && t.value.type !== value.type)));
				break;
		}
	};

	return (
		<div className="modal modalPage" onClick={onClickOutsideModal}>
			<div className="modal-dialog">
				<div className="modal-content">
					<ul className="modal-header">
						<h4 className="modal-title">{i18next.t('AUTOMIX_MODAL.TITLE')}</h4>
						<button className="closeModal" onClick={closeModalWithContext}>
							<i className="fas fa-times" />
						</button>
					</ul>
					<div className="modal-body automix">
						<p className="autoMixExplanation">{i18next.t('AUTOMIX_MODAL.DESCRIPTION')}</p>
						<div className="filterContainer">
							<label className="filterLabel" htmlFor="automix-playlist-name">
								{i18next.t('AUTOMIX_MODAL.NAME')}
							</label>
							<input
								className="filterInput"
								data-exclude={true}
								type="text"
								name="name"
								id="automix-playlist-name"
								onChange={e => setPlaylistName(e.target.value)}
								placeholder={i18next.t('AUTOMIX_MODAL.NAME_PLACEHOLDER')}
							/>
						</div>
						<h5>{i18next.t('AUTOMIX_MODAL.CRITERIA')}</h5>
						<div className="filterContainer btn-group">
							<select
								className="filterElement filterTags"
								onChange={e => {
									setCriteriaType(Number(e.target.value));
									if (Number(e.target.value) !== 1001) tagSearch('', Number(e.target.value));
									setSearch({ value: '', label: '' });
									setType('');
								}}
								defaultValue={criteriaType}
							>
								<option key={FAVORITES.type} value={FAVORITES.type}>
									{i18next.t('AUTOMIX_MODAL.FAVOURITES')}
								</option>
								<option key={ANIMELISTS.type} value={ANIMELISTS.type}>
									{i18next.t('AUTOMIX_MODAL.ANIMELISTS')}
								</option>
								{Object.entries(tagTypes).map(([key, value]) => (
									<option key={value.type} value={value.type}>
										{i18next.t(`TAG_TYPES.${key}_other`)}
									</option>
								))}
								<option key={YEARS.type} value={YEARS.type}>
									{i18next.t('DETAILS.YEAR')}
								</option>
							</select>
							<div className="filterElement filterTagsOptions">
								<Autocomplete
									value={search.value}
									options={criteriaType === 1001 || criteriaType === 1002 ? users : tags}
									onType={criteriaType === 1001 || criteriaType === 1002 ? setType : tagSearch}
									onChange={value => setSearch(value)}
									provideLabels={true}
								/>
							</div>
							<button
								className="btn btn-default btn-action"
								onClick={addCriterion}
								disabled={search.value === ''}
							>
								<i className="fas fa-plus" /> {i18next.t('CRITERIA.ADD')}
							</button>
						</div>
						{!(
							userFavoritesList.length === 0 &&
							userAnimeList.length === 0 &&
							tagList.length === 0 &&
							yearList.length === 0
						) ? (
							<ul className="autoMixCriteria">
								{userFavoritesList.map(el => {
									return (
										<li key={el.value} data-key={el.value}>
											<button
												className="btn btn-default"
												onClick={() => deleteCriterion('favorites', el.value)}
											>
												<i className="fas fa-fw fa-trash"></i>
											</button>{' '}
											<i className="fas fa-fw fa-star"></i>{' '}
											{i18next.t('AUTOMIX_MODAL.FAVOURITES_OF', { name: el.label })}
										</li>
									);
								})}
								{userAnimeList.map(el => {
									return (
										<li key={el.value} data-key={el.value}>
											<button
												className="btn btn-default"
												onClick={() => deleteCriterion('animelist', el.value)}
											>
												<i className="fas fa-fw fa-trash"></i>
											</button>{' '}
											<i className="fas fa-fw fa-th-list"></i>{' '}
											{i18next.t('AUTOMIX_MODAL.ANIMELISTS_OF', { name: el.label })}
										</li>
									);
								})}
								{tagList.map(el => {
									return (
										<li
											key={`${el.value.tid}~${el.value.type}`}
											data-key={`${el.value.tid}~${el.value.type}`}
										>
											<button
												className="btn btn-default"
												onClick={() => deleteCriterion('tag', el.value)}
											>
												<i className="fas fa-fw fa-trash"></i>
											</button>{' '}
											<i
												className={
													'fas fa-fw fa-' + tagTypes[getTagTypeName(el.value.type)].icon
												}
											></i>{' '}
											{el.label}
										</li>
									);
								})}
								{yearList.map(el => {
									return (
										<li key={`${el.value}~0}`} data-key={`${el.value}~0`}>
											<button
												className="btn btn-default"
												onClick={() => deleteCriterion('year', el.value)}
											>
												<i className="fas fa-fw fa-trash"></i>
											</button>{' '}
											<i className="fas fa-fw fa-calendar-days"></i> {el.label}
										</li>
									);
								})}
							</ul>
						) : null}
						<h5>{i18next.t('AUTOMIX_MODAL.LIMIT')}</h5>
						<div className="filterContainer">
							<select
								className="filterElement filterTags"
								defaultValue="duration"
								onChange={e => setLimitType(e.target.value as PlaylistLimit)}
							>
								<option value="duration">{i18next.t('AUTOMIX_MODAL.LIMIT_TYPE.DURATION')}</option>
								<option value="songs">{i18next.t('AUTOMIX_MODAL.LIMIT_TYPE.SONGS')}</option>
							</select>
							<input
								className="filterInput"
								data-exclude={true}
								type="number"
								min="0"
								name="duration"
								onChange={e => setLimitNumber(Number(e.target.value))}
								placeholder={i18next.t(
									limitType === 'duration' ? 'AUTOMIX_MODAL.DURATION' : 'AUTOMIX_MODAL.NUMBER_SONGS'
								)}
							/>
						</div>
						<div className="checkbox">
							<label>
								<input
									type="checkbox"
									defaultChecked={false}
									onChange={e => setSurprisePlaylist(e.target.checked)}
								/>{' '}
								{i18next.t('AUTOMIX_MODAL.IS_ADMIN_PLAYER')}
							</label>
						</div>
						<button className="btn btn-default confirm" onClick={onClick}>
							{limitNumber === 0 ||
							(userFavoritesList.length === 0 &&
								userAnimeList.length === 0 &&
								tagList.length === 0 &&
								yearList.length === 0) ? (
								<>
									<i className="fas fa-fw fa-exclamation-triangle" />{' '}
									{i18next.t('AUTOMIX_MODAL.EMPTY')}
								</>
							) : (
								<>
									<i className="fas fa-fw fa-check" /> {i18next.t('AUTOMIX_MODAL.MIX')}
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

export default AutoMixModal;
