import './BlacklistCriterias.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import { BLC, BLCSet } from '../../../../../src/types/blacklist';
import GlobalContext from '../../../store/context';
import { buildKaraTitle } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { Tag } from '../../types/tag';
import Autocomplete from '../generic/Autocomplete';

const listTypeBlc = [
	'BLCTYPE_1002',
	'BLCTYPE_1003',
	'BLCTYPE_1004',
	'BLCTYPE_1005',
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
	'BLCTYPE_13',
	'BLCTYPE_14'
];

interface IProps {
	data: Array<BLC>;
	tags: Array<Tag> | undefined;
	blSet: BLCSet;
}

interface IState {
	bcType: number;
	bcVal: string;
}

class BlacklistCriterias extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	constructor(props: IProps) {
		super(props);
		this.state = {
			bcType: 1002,
			bcVal: ''
		};
	}

	addBlacklistCriteria = () => {
		commandBackend('createBLC', {
			blcs: [{ type: this.state.bcType, value: this.state.bcVal }],
			set_id: this.props.blSet.blc_set_id
		});
	};

	deleteCriteria = (bcId: number) => {
		commandBackend('deleteBLC', { set_id: this.props.blSet.blc_set_id, blc_ids: [bcId] });
	};

	render() {
		const types: Array<number> = [];
		this.props.data?.forEach(element => {
			if (!types.includes(element.type)) types.push(element.type);
		});
		const tagsFiltered = this.props.tags ? this.props.tags.filter(obj => obj.type.includes(this.state.bcType)) : [];
		return (
			<div className="blcContainer">
				<div className="bcDescription">{i18next.t('BLC.BLC_DESC')}</div>
				<div className="blacklist-criterias-input">
					<select onChange={e => this.setState({ bcType: Number(e.target.value), bcVal: '' })}>
						{listTypeBlc.map((value) => {
							return <option key={value} value={value.replace('BLCTYPE_', '')}>{i18next.t(`BLACKLIST.${value}`)}</option>;
						})
						}
					</select>
					<div className="bcValContainer">
						{tagsFiltered.length > 0 ?
							<Autocomplete value={this.state.bcVal}
								options={tagsFiltered} onChange={value => this.setState({ bcVal: value })} /> :
							<input type="text" value={this.state.bcVal} placeholder={i18next.t('BLC.ADD_BLC')}
								className="input-blc" onChange={e => this.setState({ bcVal: e.target.value })}
								onKeyPress={e => {
									if (e.key === 'Enter') this.addBlacklistCriteria();
								}} />
						}
						<button className="btn btn-default btn-action addBlacklistCriteria" onClick={this.addBlacklistCriteria}><i className="fas fa-plus"/></button>
					</div>
				</div>
				{types.map((type) => {
					return <React.Fragment key={type}>
						<div className="list-group-item liType">{i18next.t('BLACKLIST.BLCTYPE_' + type)}</div>
						{this.props.data.map(criteria => {
							return (criteria.type === type ?
								<div key={criteria.blcriteria_id} className="list-group-item liTag">
									<div className="actionDiv">
										<button title={i18next.t('BLC.DELETE_BLC')} name="deleteCriteria"
											className="btn btn-action deleteCriteria" onClick={() => this.deleteCriteria(criteria.blcriteria_id as number)}>
											<i className="fas fa-eraser"></i>
										</button>
									</div>
									<div className="contentDiv">
										{criteria.type === 1001 ?
											buildKaraTitle(
												this.context.globalState.settings.data,
												Array.isArray(criteria.value) ?
													criteria.value[0] :
													criteria.value, true) :
											(criteria.value_i18n ?
												criteria.value_i18n :
												criteria.value
											)
										}
									</div>
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

export default BlacklistCriterias;
