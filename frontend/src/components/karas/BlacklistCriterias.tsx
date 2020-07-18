import './BlacklistCriterias.scss';

import axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';

import { BLC, BLCSet } from '../../../../src/types/blacklist';
import { Tag } from '../../types/tag';
import Autocomplete from '../generic/Autocomplete';
import { buildKaraTitle } from '../tools';

const listTypeBlc = [
	'BLCTYPE_1002',
	'BLCTYPE_1003',
	'BLCTYPE_1004',
	'BLCTYPE_0',
	'BLCTYPE_1',
	'BLCTYPE_2',
	'BLCTYPE_3',
	'BLCTYPE_4',
	'BLCTYPE_5',
	'BLCTYPE_6',
	'BLCTYPE_8',
	'BLCTYPE_9',
	'BLCTYPE_7',
	'BLCTYPE_10',
	'BLCTYPE_11',
	'BLCTYPE_12',
	'BLCTYPE_13',];

interface IProps {
	scope: string;
	data: Array<BLC>;
	tags: Array<Tag> | undefined;
	blSet: BLCSet;
}


interface IState {
	bcType: number;
	bcVal: string;
}

class BlacklistCriterias extends Component<IProps, IState> {
	constructor(props: IProps) {
		super(props);
		this.state = {
			bcType: 1002,
			bcVal: ''
		};
	}

	addBlacklistCriteria = () => {
		axios.post(`/blacklist/set/${this.props.blSet.blc_set_id}/criterias`,
			{ blcriteria_type: this.state.bcType, blcriteria_value: this.state.bcVal });
	};

	deleteCriteria = (bcId: number) => {
		axios.delete(`/blacklist/set/${this.props.blSet.blc_set_id}/criterias/${bcId}`);
	};

	render() {
		const types: Array<number> = [];
		this.props.data?.forEach(element => {
			if (!types.includes(element.type)) types.push(element.type);
		});
		const tagsFiltered = this.props.tags ? this.props.tags.filter(obj => obj.type.includes(this.state.bcType)) : [];
		return (
			<React.Fragment>
				{this.props.scope === 'admin' ?
					<span className="blacklist-criterias-input">
						<select onChange={e => this.setState({ bcType: Number(e.target.value), bcVal: '' })}>
							{listTypeBlc.map((value) => {
								return <option key={value} value={value.replace('BLCTYPE_', '')}>{i18next.t(value)}</option>;
							})
							}
						</select>
						<span id="bcValContainer" style={{ color: 'black' }}>
							{tagsFiltered.length > 0 ?
								<Autocomplete value={this.state.bcVal}
									options={tagsFiltered} onChange={value => this.setState({ bcVal: value })} /> :
								<input type="text" value={this.state.bcVal} placeholder={i18next.t('BLC.ADD_BLC')}
									className="input-blc" onChange={e => this.setState({ bcVal: e.target.value })} />
							}
						</span>
						<button className="btn btn-default btn-action addBlacklistCriteria" onClick={this.addBlacklistCriteria}
							onKeyPress={e => {
								if (e.which == 13) this.addBlacklistCriteria();
							}}><i className="fas fa-plus"></i></button>
					</span> : null
				}
				{types.map((type) => {
					return <React.Fragment key={type}>
						<li className="list-group-item liType">{i18next.t('BLCTYPE_' + type)}</li>
						{this.props.data.map(criteria => {
							return (criteria.type === type ?
								<li key={criteria.blcriteria_id} className="list-group-item liTag">
									<div className="actionDiv">
										<button title={i18next.t('BLC.DELETE_BLC')} name="deleteCriteria"
											className="btn btn-action deleteCriteria" onClick={() => this.deleteCriteria(criteria.blcriteria_id as number)}>
											<i className="fas fa-minus"></i>
										</button>
									</div>
									<div className="typeDiv">{i18next.t('BLCTYPE_' + criteria.type)}</div>
									<div className="contentDiv">
										{criteria.type == 1001 ?
											buildKaraTitle(
												Array.isArray(criteria.value) ?
													criteria.value[0] :
													criteria.value, true) :
											(criteria.value_i18n ?
												criteria.value_i18n :
												criteria.value
											)
										}
									</div>
								</li> : null
							);
						})}
					</React.Fragment>;
				})
				}
			</React.Fragment>
		);
	}
}

export default BlacklistCriterias;
