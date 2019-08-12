import React, { Component } from "react";
import i18next from 'i18next';
import axios from "axios";
import Autocomplete from '../generic/Autocomplete'
import { buildKaraTitle } from '../tools';

var listTypeBlc = [
    'BLCTYPE_1002',
    'BLCTYPE_1003',
    'BLCTYPE_1004',
    'BLCTYPE_1000',
    'BLCTYPE_0',
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

class BlacklistCriterias extends Component {
    constructor(props) {
        super(props);
        this.state = {
            bcType: "1002",
            bcVal: ""
        };
        this.addBlacklistCriteria = this.addBlacklistCriteria.bind(this);
        this.deleteCriteria = this.deleteCriteria.bind(this);
    }

    addBlacklistCriteria() {
        axios.post('/api/' + this.props.scope + '/blacklist/criterias',
            { blcriteria_type: this.state.bcType, blcriteria_value: this.state.bcVal });
    }

    deleteCriteria(bcId) {
        axios.delete('/api/' + this.props.scope + '/blacklist/criterias/' + bcId)
    }

    render() {
        var types = [];
        this.props.data.forEach(element => {
            if (!types.includes(element.type)) types.push(element.type);
        });
        var tagsFiltered = this.props.tags ? this.props.tags.filter(obj => obj.type == this.state.bcType) : [];
        return (
            <React.Fragment>
                {this.props.scope === 'admin' ?
                    <span id="blacklistCriteriasInputs" className="list-group-item" style={{ padding: "10px" }}>
                        <select id="bcType" className="input-sm form-control" onChange={e => this.setState({ bcType: e.target.value })}>
                            {listTypeBlc.map((value) => {
                                return <option key={value} value={value.replace('BLCTYPE_', '')}>{i18next.t(value)}</option>
                            })
                            }
                        </select>
                        <span id="bcValContainer" style={{ color: "black" }}>
                            {tagsFiltered.length > 0 ?
                                <Autocomplete className="form-control" name="bcVal" value={this.state.bcVal}
                                    options={tagsFiltered} onChange={value => this.setState({ bcVal: value })} /> :
                                <input type="text" id="bcVal" value={this.state.bcVal}
                                    className="input-sm" onChange={e => this.setState({ bcVal: e.target.value })} />
                            }
                        </span>
                        <button id="bcAdd" className="btn btn-default btn-action addBlacklistCriteria" onClick={this.addBlacklistCriteria}
                            onKeyPress={e => {
                                if (e.which == 13) addBlacklistCriteria()
                            }}><i className="fas fa-plus"></i></button>
                    </span> : null
                }
                {types.map((type) => {
                    return <React.Fragment key={type}>
                        <li className="list-group-item liType" type={type}>{i18next.t('BLCTYPE_' + type)}</li>
                        {this.props.data.map(criteria => {
                            return (criteria.type === type ?
                                <li key={criteria.blcriteria_id} className="list-group-item liTag">
                                    <div className="actionDiv">
                                        <button title={i18next.t('TOOLTIP_DELETECRITERIA')} name="deleteCriteria"
                                            className="btn btn-action deleteCriteria" onClick={() => this.deleteCriteria(criteria.blcriteria_id)}>
                                            <i className="fas fa-minus"></i>
                                        </button>
                                    </div>
                                    <div className="typeDiv">{i18next.t('BLCTYPE_' + criteria.type)}</div>
                                    <div className="contentDiv">{criteria.type == 1001 ? buildKaraTitle(criteria.value[0]) : criteria.value}</div>
                                </li> : null
                            )
                        })}
                    </React.Fragment>
                })
                }
            </React.Fragment>
        )
    }
}

export default BlacklistCriterias;
