import React, { Component } from "react";
import { withTranslation } from 'react-i18next';
import axios from "axios";
import Autocomplete from '../Autocomplete'
import {buildKaraTitle} from '../toolsReact';

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
    'BLCTYPE_7',
    'BLCTYPE_8',
    'BLCTYPE_9'];

class BlacklistCriterias extends Component {
    constructor(props) {
        super(props);
        this.state = {
            bcType: "1002",
            bcVal: ""
        };
    }

    addBlacklistCriteria () {
        axios.post('/api/' + scope + '/blacklist/criterias',
         { blcriteria_type: this.state.bcType, blcriteria_value: this.state.bcVal });
    }

    deleteCriteria (bcId) {
        axios.delete('/api/' + scope + '/blacklist/criterias/' + bcId)
    }

    render() {
        const t = this.props.t;
        console.log(this.props.data)
        var tagsFiltered = this.props.tags ? this.props.tags.filter(obj => obj.type == this.state.bcType) : [];
        return (
                <React.Fragment>
                    {this.props.scope === 'admin' ?
                        <span id="blacklistCriteriasInputs" className="list-group-item" style={{padding:"10px"}}>
                            <select id="bcType" className="input-sm form-control" onChange={e => this.setState({bcType: e.target.value})}>
                                {listTypeBlc.map((value) => {
                                    return <option key={value} value={value.replace('BLCTYPE_','')}>{t(value)}</option>
                                    })
                                }
                            </select>
                            <span id="bcValContainer" style={{color:"black"}}>
                                {tagsFiltered.length > 0 ? 
                                    <Autocomplete className="form-control" name="bcVal" value={this.state.bcVal} 
                                        options={tagsFiltered} onChange={value => this.setState({bcVal: value})} /> :
                                    <input type="text" id="bcVal" className="input-sm"/>
                                }
                            </span> 
                            <button id="bcAdd" className="btn btn-default btn-action addBlacklistCriteria" onClick={this.addBlacklistCriteria}
                            onKeyPress={e => {
                                if (e.which == 13) addBlacklistCriteria()
                            } }></button>
                        </span> : null
                    }
                    {this.props.data.content && this.props.data.content.map(criteria => {

                        return <React.Fragment>
                            {!this.state.types.includes(criteria.type) ?
                                <li className="list-group-item liType" type={criteria.type}>{t('BLCTYPE_' + criteria.type)}</li> : null}

                        <li className="list-group-item liTag">
                            <div className="actionDiv">
                                <button title={t('TOOLTIP_DELETECRITERIA')} name="deleteCriteria" 
                                    className="btn btn-action deleteCriteria" onClick={() => this.deleteCriteria(criteria.blcriteria_id)}></button>
                            </div>
                            <div className="typeDiv">{t('BLCTYPE_' + criteria.type)}</div>
                            <div className="contentDiv">{criteria.type == 1001 ? buildKaraTitle(criteria.value[0]) : criteria.value}</div>'
                        </li>
                        </React.Fragment>
                    })}
                </React.Fragment>
        )
    }
}

export default withTranslation()(BlacklistCriterias);
