import './CriteriasList.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import { Criteria } from '../../../../../src/lib/types/playlist';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { hmsToSecondsOnly, secondsTimeSpanToHMS } from '../../../utils/tools';
import { Tag } from '../../types/tag';
import Autocomplete from '../generic/Autocomplete';

const listTypeCriteria = [
	'CRITERIA_TYPE_1002',
	'CRITERIA_TYPE_1003',
	'CRITERIA_TYPE_1004',
	'CRITERIA_TYPE_1005',
	'CRITERIA_TYPE_1006',
	'CRITERIA_TYPE_0',
	'CRITERIA_TYPE_1',
	'CRITERIA_TYPE_2',
	'CRITERIA_TYPE_3',
	'CRITERIA_TYPE_4',
	'CRITERIA_TYPE_5',
	'CRITERIA_TYPE_6',
	'CRITERIA_TYPE_8',
	'CRITERIA_TYPE_9',
	'CRITERIA_TYPE_7',
	'CRITERIA_TYPE_10',
	'CRITERIA_TYPE_11',
	'CRITERIA_TYPE_12',
	'CRITERIA_TYPE_13',
	'CRITERIA_TYPE_14'
];

interface IProps {
	tags: Array<Tag> | undefined;
	plaid: string;
}

interface IState {
	criterias: Criteria[]
	criteriaType: number;
	criteriaVal: string | number;
}

class CriteriasList extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			criteriaType: 1002,
			criteriaVal: '',
			criterias: []
		};
	}

	componentDidMount() {
		this.getCriterias();
	}

	getCriterias = async () => {
		const user = this.context.globalState.settings.data.user;
		const criterias = await commandBackend('getCriterias', {
			plaid: this.props.plaid,
			langs: [user.main_series_lang, user.fallback_series_lang]
		});
		this.setState({ criterias });
	}


	addCriteria = async () => {
		let value = this.state.criteriaVal;
		if (this.state.criteriaType === 1006) {
			value = 'MISSING';
		} else if ([1002, 1003].includes(this.state.criteriaType) && typeof this.state.criteriaVal === 'string') {
			value = hmsToSecondsOnly(this.state.criteriaVal);
		}
		await commandBackend('addCriterias', {
			criterias: [{
				type: this.state.criteriaType,
				value: value,
				plaid: this.props.plaid
			}]
		});
		this.getCriterias();
	};

	deleteCriteria = async (criteriaToDelete: Criteria) => {
		await commandBackend('removeCriterias', { criterias: [criteriaToDelete] });
		this.getCriterias();
	};

	render() {
		const types: Array<number> = [];
		this.state.criterias.forEach(element => {
			if (!types.includes(element.type)) types.push(element.type);
		});
		const tagsFiltered = this.props.tags ? this.props.tags.filter(obj => obj.type.includes(this.state.criteriaType)) : [];
		return (
			<div className="criteriasContainer">
				<div className="criteriasDescription">{i18next.t('CRITERIA.CRITERIA_DESC')}</div>
				<div className="criterias-input">
					<select onChange={e => this.setState({ criteriaType: Number(e.target.value), criteriaVal: '' })}>
						{listTypeCriteria.map((value) => {
							return <option key={value} value={value.replace('CRITERIA_TYPE_', '')}>{i18next.t(`CRITERIA.${value}`)}</option>;
						})
						}
					</select>
					<div className="criteriasValContainer">
						{this.state.criteriaType === 1006 ?
							<input type="text" placeholder={i18next.t('CRITERIA.CRITERIA_TYPE_1006')}
								className="input-blc" disabled
							/> :
							tagsFiltered.length > 0 ?
								<Autocomplete value={this.state.criteriaVal}
									options={tagsFiltered} onChange={value => this.setState({ criteriaVal: value })} /> :
								<input type="text" value={this.state.criteriaVal}
									placeholder={`${i18next.t('CRITERIA.ADD')} ${[1002, 1003].includes(this.state.criteriaType) ? 'mm:ss' : ''}`}
									className="input-blc" onChange={e => this.setState({ criteriaVal: e.target.value })}
									onKeyPress={e => {
										if (e.key === 'Enter') this.addCriteria();
									}} />
						}
						<button className="btn btn-default btn-action" onClick={this.addCriteria}><i className="fas fa-plus" /></button>
					</div>
				</div>
				{types.map((type) => {
					return <React.Fragment key={type}>
						<div className="list-group-item liType">{i18next.t('CRITERIA.CRITERIA_TYPE_' + type)}</div>
						{this.state.criterias.map(criteria => {
							return (criteria.type === type ?
								<div key={criteria.value} className="list-group-item liTag">
									<div className="actionDiv">
										<button title={i18next.t('CRITERIA.DELETE')} name="deleteCriteria"
											className="btn btn-action deleteCriteria" onClick={() => this.deleteCriteria(criteria)}>
											<i className="fas fa-eraser"></i>
										</button>
									</div>
									{criteria.type !== 1006 ?
										<div className="contentDiv">
											{criteria.type === 1001 ?
												buildKaraTitle(
													this.context.globalState.settings.data,
													Array.isArray(criteria.value) ?
														criteria.value[0] :
														criteria.value, true) :
												(criteria.value_i18n ?
													criteria.value_i18n :
													([1002, 1003].includes(criteria.type) ?
														secondsTimeSpanToHMS(criteria.value, 'mm:ss')
														: criteria.value
													)
												)
											}
										</div> : null
									}
								</div> : null
							);
						})}
					</React.Fragment>;
				})
				}
			</div>
		);
	}
}

export default CriteriasList;
