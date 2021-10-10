import './CriteriasList.scss';

import i18next from 'i18next';
import React, { useContext, useEffect, useState } from 'react';

import { DBPL } from '../../../../../src/lib/types/database/playlist';
import { Criteria } from '../../../../../src/lib/types/playlist';
import { setSettings } from '../../../store/actions/settings';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { getTagTypeName, tagTypes, YEARS } from '../../../utils/tagTypes';
import { hmsToSecondsOnly, secondsTimeSpanToHMS } from '../../../utils/tools';
import { Tag } from '../../types/tag';
import Autocomplete from '../generic/Autocomplete';
import Switch from '../generic/Switch';

const listTypeCriteria = [1002, 1003, 1004, 1005, 1006];

interface IProps {
	tags: Tag[] | undefined;
	playlist: DBPL;
}

function CriteriasList(props: IProps) {
	const context = useContext(GlobalContext);
	const [criterias, setCriterias] = useState<Criteria[]>([]);
	const [criteriaType, setCriteriaType] = useState(1002);
	const [criteriaVal, setCriteriaVal] = useState<string | number>('');

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
		await commandBackend('addCriterias', {
			criterias: [
				{
					type: criteriaType,
					value: value,
					plaid: props.playlist.plaid,
				},
			],
		});
		getCriterias();
	};

	const deleteCriteria = async (criteriaToDelete: Criteria) => {
		await commandBackend('removeCriterias', { criterias: [criteriaToDelete] });
		getCriterias();
	};

	const editPlaylist = async (e: any) => {
		await commandBackend('editPlaylist', {
			name: props.playlist.name,
			plaid: props.playlist.plaid,
			type_smart: e.target.checked ? 'UNION' : 'INTERSECT'
		});
		setSettings(context.globalDispatch);
	};

	useEffect(() => {
		getCriterias();
	}, []);

	const types: number[] = [];
	criterias.forEach((element) => {
		if (!types.includes(element.type)) types.push(element.type);
	});
	const tagsFiltered = props.tags ? props.tags.filter((obj) => obj.type.includes(criteriaType)) : [];
	return (
		<div className="criteriasContainer">
			<div className="criterias-type-smart">
				<div>{i18next.t('CRITERIA.TYPE_SMART')}</div>
				<div className="criterias-type-smart-label">
					<Switch
						handleChange={editPlaylist}
						isChecked={props.playlist.type_smart === 'UNION'}
						onLabel={i18next.t('CRITERIA.OR')}
						offLabel={i18next.t('CRITERIA.AND')}
					/>
				</div>
				<div>{i18next.t('CRITERIA.TYPE_SMART_DESC')}</div>
			</div>
			<div className="criteriasDescription">{i18next.t('CRITERIA.CRITERIA_DESC')}</div>
			<div className="criterias-input">
				<select
					onChange={(e) => {
						setCriteriaType(Number(e.target.value));
						setCriteriaVal('');
					}}
				>
					{listTypeCriteria.map((value) => {
						return (
							<option key={value} value={value}>
								{i18next.t(`CRITERIA.CRITERIA_TYPE_${value}`)}
							</option>
						);
					})}
					{Object.entries(tagTypes).map(([key, value]) => (
						<option key={value.type} value={value.type}>
							{i18next.t(`TAG_TYPES.${key}`, { count: 2 })}
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
					) : tagsFiltered.length > 0 ? (
						<Autocomplete
							value={criteriaVal}
							options={tagsFiltered}
							onChange={(value) => setCriteriaVal(value)}
						/>
					) : (
						<input
							type="text"
							value={criteriaVal}
							placeholder={`${i18next.t('CRITERIA.ADD')} ${[1002, 1003].includes(criteriaType) ? 'mm:ss' : ''}`}
							className="input-blc"
							onChange={(e) => setCriteriaVal(e.target.value)}
							onKeyPress={(e) => {
								if (e.key === 'Enter') addCriteria();
							}}
						/>
					)}
					<button className="btn btn-default btn-action" onClick={addCriteria}>
						<i className="fas fa-plus" />
					</button>
				</div>
			</div>
			{
				types.map((type) => {
					let typeLabel;
					if (type === 0) {
						typeLabel = i18next.t('DETAILS.YEAR');
					} else if (type > 1000) {
						typeLabel = i18next.t(`CRITERIA.CRITERIA_TYPE_${type}`);
					} else {
						typeLabel = i18next.t(`TAG_TYPES.${getTagTypeName(type)}`, { count: 2 });
					}
					return (
						<React.Fragment key={type}>
							<div className="list-group-item liType">{typeLabel}</div>
							{criterias.map((criteria) => {
								return criteria.type === type ? (
									<div key={criteria.value} className="list-group-item liTag">
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
						</React.Fragment>
					);
				})
			}
		</div >
	);
}

export default CriteriasList;
