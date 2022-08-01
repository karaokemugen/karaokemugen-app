import './CriteriasList.scss';

import i18next from 'i18next';
import { Fragment, useContext, useEffect, useState } from 'react';
import { Trans } from 'react-i18next';

import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { Criteria } from '../../../../../src/lib/types/playlist';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { useTagSearch } from '../../../utils/hooks';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend, getSocket } from '../../../utils/socket';
import { getTagTypeName, tagTypes, YEARS } from '../../../utils/tagTypes';
import { hmsToSecondsOnly, secondsTimeSpanToHMS } from '../../../utils/tools';
import Autocomplete from '../generic/Autocomplete';
import Switch from '../generic/Switch';

const listTypeCriteria = [1002, 1003, 1004, 1005, 1006];

interface IProps {
	playlist: DBPL;
}

function CriteriasList(props: IProps) {
	const context = useContext(GlobalContext);
	const [criterias, setCriterias] = useState<Criteria[]>([]);
	const [criteriaType, setCriteriaType] = useState(1002);
	const [criteriaVal, setCriteriaVal] = useState<string | number>('');
	const [flagSmartLimit, setFlagSmartLimit] = useState(props.playlist.flag_smartlimit);
	const [smartLimitNumber, setSmartLimitNumber] = useState(props.playlist.smart_limit_number);
	const [typeSmart, setTypeSmart] = useState(props.playlist.type_smart);

	const getCriterias = async () => {
		const user = context.globalState.settings.data.user;
		const criteriasList = await commandBackend('getCriterias', {
			plaid: props.playlist.plaid,
			langs: [user.main_series_lang, user.fallback_series_lang],
		});
		setCriterias(criteriasList);
	};

	const addCriteria = async () => {
		let value = criteriaVal;
		if (criteriaType === 1006) {
			value = 'MISSING';
		} else if ([1002, 1003].includes(criteriaType) && typeof criteriaVal === 'string') {
			value = hmsToSecondsOnly(criteriaVal);
		}
		if (value) {
			await commandBackend('addCriterias', {
				criterias: [
					{
						type: criteriaType,
						value: value,
						plaid: props.playlist.plaid,
					},
				],
			});
			setCriteriaVal('');
			getCriterias();
		}
	};

	const deleteCriteria = async (criteriaToDelete: Criteria) => {
		criteriaToDelete.value = criteriaToDelete.type === 1001 ? criteriaToDelete.value.kid : criteriaToDelete.value;
		await commandBackend('removeCriterias', { criterias: [criteriaToDelete] });
		getCriterias();
	};

	const editTypeSmart = (e: any) => {
		const type = e.target.checked ? 'UNION' : 'INTERSECT';
		setTypeSmart(type);
		editPlaylist({
			type_smart: type,
		});
	};

	const editFlagSmartLimit = (e: any) => {
		setFlagSmartLimit(e.target.checked);
		editPlaylist({
			flag_smartlimit: e.target.checked,
		});
	};

	const editSmartLimitNumber = (e: any) => {
		const limitNumber = Number(e.target.value) && Number(e.target.value) !== 0 ? Number(e.target.value) : 0;
		const flag = Number(e.target.value) && Number(e.target.value) !== 0 ? props.playlist.flag_smartlimit : false;
		setFlagSmartLimit(flag);
		setSmartLimitNumber(limitNumber);
		editPlaylist({
			smart_limit_number: limitNumber,
			flag_smartlimit: flag,
		});
	};

	const editSmartLimitOrder = (e: any) =>
		editPlaylist({
			smart_limit_order: e.target.value,
		});

	const editSmartLimitType = (e: any) =>
		editPlaylist({
			smart_limit_type: e.target.value,
		});

	const editPlaylist = async (data: any) => {
		await commandBackend('editPlaylist', {
			...data,
			name: props.playlist.name,
			plaid: props.playlist.plaid,
		});
		setSettings(context.globalDispatch);
	};

	const playlistContentsUpdated = (idPlaylist: string) => {
		if (props.playlist.plaid === idPlaylist) getCriterias();
	};

	useEffect(() => {
		getSocket().on('playlistContentsUpdated', playlistContentsUpdated);
		getCriterias();
		return () => {
			getSocket().off('playlistContentsUpdated', playlistContentsUpdated);
		};
	}, []);

	const types: number[] = [];
	criterias.forEach(element => {
		if (!types.includes(element.type)) types.push(element.type);
	});

	const [tags, tagSearch] = useTagSearch(criteriaType, context);

	return (
		<div className="criteriasContainer">
			<div className="criterias-line">
				<div>{i18next.t('CRITERIA.TYPE_SMART')}</div>
				<div className="criterias-type-smart-label">
					<Switch
						handleChange={editTypeSmart}
						isChecked={typeSmart === 'UNION'}
						onLabel={i18next.t('CRITERIA.OR')}
						offLabel={i18next.t('CRITERIA.AND')}
					/>
				</div>
				<div>{i18next.t('CRITERIA.TYPE_SMART_DESC')}</div>
			</div>
			<div className="criterias-line">
				<Trans
					i18nKey="CRITERIA.PLAYLIST_DURATION"
					components={{
						1: <input type="checkbox" checked={flagSmartLimit} onChange={editFlagSmartLimit} />,
						2: (
							<input
								type="number"
								value={smartLimitNumber}
								data-exclude="true"
								min={0}
								onChange={editSmartLimitNumber}
							/>
						),
						3: (
							<select onChange={editSmartLimitType} defaultValue={props.playlist.smart_limit_type}>
								<option key="duration" value="duration">
									{i18next.t('CRITERIA.PLAYLIST_DURATION_TYPE_MINUTES')}
								</option>
								<option key="songs" value="songs">
									{i18next.t('CRITERIA.PLAYLIST_DURATION_TYPE_SONGS')}
								</option>
							</select>
						),
						4: (
							<select onChange={editSmartLimitOrder} defaultValue={props.playlist.smart_limit_order}>
								<option key="newest" value="newest">
									{i18next.t('CRITERIA.PLAYLIST_DURATION_ORDER_MORE_RECENT')}
								</option>
								<option key="oldest" value="oldest">
									{i18next.t('CRITERIA.PLAYLIST_DURATION_ORDER_LESS_RECENT')}
								</option>
							</select>
						),
					}}
				/>
			</div>
			<div className="criteriasDescription">{i18next.t('CRITERIA.CRITERIA_DESC')}</div>
			<div className="criterias-input">
				<select
					onChange={e => {
						setCriteriaType(Number(e.target.value));
						tagSearch('', Number(e.target.value));
						setCriteriaVal('');
					}}
				>
					{listTypeCriteria.map(value => {
						return (
							<option key={value} value={value}>
								{i18next.t(`CRITERIA.CRITERIA_TYPE_${value}`)}
							</option>
						);
					})}
					{Object.entries(tagTypes).map(([key, value]) => (
						<option key={value.type} value={value.type}>
							{i18next.t(`TAG_TYPES.${key}_other`)}
						</option>
					))}
					<option key={YEARS.type} value={YEARS.type}>
						{i18next.t('DETAILS.YEAR')}
					</option>
				</select>
				<div className="criteriasValContainer">
					{criteriaType === 1006 ? (
						<input
							type="text"
							placeholder={i18next.t('CRITERIA.CRITERIA_TYPE_1006')}
							className="input-blc"
							disabled
						/>
					) : criteriaType < 999 ? (
						<Autocomplete
							value={criteriaVal}
							options={tags}
							onType={tagSearch}
							onChange={value => setCriteriaVal(value)}
						/>
					) : (
						<input
							type="text"
							value={criteriaVal}
							placeholder={`${i18next.t('CRITERIA.ADD_PLACEHOLDER')} ${
								[1002, 1003].includes(criteriaType) ? 'mm:ss' : ''
							}`}
							className="input-blc"
							onChange={e => setCriteriaVal(e.target.value)}
							onKeyPress={e => {
								if (e.key === 'Enter') addCriteria();
							}}
						/>
					)}
					<button className="btn btn-default btn-action" onClick={addCriteria}>
						<i className="fas fa-plus" /> {i18next.t('CRITERIA.ADD')}
					</button>
				</div>
			</div>
			{types.map(type => {
				let typeLabel;
				if (type === 0) {
					typeLabel = i18next.t('DETAILS.YEAR');
				} else if (type > 1000) {
					typeLabel = i18next.t(`CRITERIA.CRITERIA_TYPE_${type}`);
				} else {
					typeLabel = i18next.t(`TAG_TYPES.${getTagTypeName(type)}_other`);
				}
				return (
					<Fragment key={type}>
						<div className="list-group-item liType">{typeLabel}</div>
						{criterias.map(criteria => {
							return criteria.type === type ? (
								<div
									key={criteria.type === 1001 ? criteria.value.kid : criteria.value}
									className="list-group-item liTag"
								>
									<div className="actionDiv">
										<button
											title={i18next.t('CRITERIA.DELETE')}
											name="deleteCriteria"
											className="btn btn-action deleteCriteria"
											onClick={() => deleteCriteria(criteria)}
										>
											<i className="fas fa-eraser"></i>
										</button>
									</div>
									{criteria.type !== 1006 ? (
										<div className="contentDiv">
											{criteria.type === 1001
												? buildKaraTitle(
														context.globalState.settings.data,
														Array.isArray(criteria.value)
															? criteria.value[0]
															: criteria.value,
														true
												  )
												: criteria.value_i18n
												? criteria.value_i18n
												: [1002, 1003].includes(criteria.type)
												? secondsTimeSpanToHMS(criteria.value, 'mm:ss')
												: criteria.value}
										</div>
									) : null}
								</div>
							) : null;
						})}
					</Fragment>
				);
			})}
		</div>
	);
}

export default CriteriasList;
