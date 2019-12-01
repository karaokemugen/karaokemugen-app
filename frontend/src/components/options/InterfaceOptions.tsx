import React, { Component } from 'react';
import i18next from 'i18next';
import Switch from '../generic/Switch';
import { dotify } from '../tools';
import { Config } from '~../../../src/types/config';

interface IProps {
	config: Config;
	onChange: (e:any) => void;
}

interface IState {
	config: any;
}

class InterfaceOptions extends Component<IProps, IState> {
	constructor(props:IProps) {
		super(props);
		this.state = {
			config: dotify(this.props.config)
		};
	}

  onChange = (e:any) => {
  	var config = this.state.config;
  	var value = e.target.type === 'checkbox' ? e.target.checked : 
  		(Number(e.target.value) ? Number(e.target.value) : e.target.value);
  	if (value === 'true') {
  		value = true;
  	} else if (value === 'false') {
  		value = false;
  	}
  	config[e.target.id] = value;
  	this.setState({ config: config });
  	if (e.target.type != 'number' || (Number(e.target.value))) this.props.onChange(e);
  };

  render() {
  	return (
  		<React.Fragment>
  			<div className="form-group">
  				<label className="col-xs-4 control-label" title={i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_TOOLTIP')}>
  					{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE')}
            &nbsp;
  					<i className="far fa-question-circle"></i>
  				</label>
  				<div className="col-xs-6">
  					<select
  						className="form-control"
  						id="Frontend.Mode"
  						onChange={this.onChange}
  						value={this.state.config['Frontend.Mode']}
  					>
  						<option value={0}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_CLOSED')}</option>
  						<option value={1}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_LIMITED')}</option>
  						<option value={2}>{i18next.t('SETTINGS.INTERFACE.WEBAPPMODE_OPEN')}</option>
  					</select>
  				</div>
  			</div>

  			<div className="form-group">
  				<label className="col-xs-4 control-label">
  					{i18next.t('SERIE_NAME_MODE')}
  				</label>
  				<div className="col-xs-6">
  					<select
  						className="form-control"
  						id="Frontend.SeriesLanguageMode"
  						onChange={this.onChange}
  						value={this.state.config['Frontend.SeriesLanguageMode']}
  					>
  						<option value="0">{i18next.t('SERIE_NAME_MODE_ORIGINAL')}</option>
  						<option value="1">{i18next.t('SERIE_NAME_MODE_SONG')}</option>
  						<option value="2">{i18next.t('SERIE_NAME_MODE_ADMIN')}</option>
  						<option value="3">{i18next.t('SERIE_NAME_MODE_USER')}</option>
  					</select>
  				</div>
  			</div>

  			<div className="form-group">
  				<label className="col-xs-4 control-label">
  					{i18next.t('SETTINGS.INTERFACE.ALLOW_VIEW_BLACKLIST')}
  				</label>
  				<div className="col-xs-6">
  					<Switch idInput="Frontend.Permissions.AllowViewBlacklist" handleChange={this.onChange}
  						isChecked={this.state.config['Frontend.Permissions.AllowViewBlacklist']} />
  				</div>
  			</div>

  			<div className="form-group">
  				<label className="col-xs-4 control-label">
  					{i18next.t('SETTINGS.INTERFACE.ALLOW_VIEW_BLACKLIST_CRITERIAS')}
  				</label>
  				<div className="col-xs-6">
  					<Switch idInput="Frontend.Permissions.AllowViewBlacklistCriterias" handleChange={this.onChange}
  						isChecked={this.state.config['Frontend.Permissions.AllowViewBlacklistCriterias']} />
  				</div>
  			</div>

  			<div className="form-group">
  				<label className="col-xs-4 control-label">
  					{i18next.t('SETTINGS.INTERFACE.ALLOW_VIEW_WHITELIST')}
  				</label>
  				<div className="col-xs-6">
  					<Switch idInput="Frontend.Permissions.AllowViewWhitelist" handleChange={this.onChange}
  						isChecked={this.state.config['Frontend.Permissions.AllowViewWhitelist']} />
  				</div>
  			</div>
  		</React.Fragment>
  	);
  }
}

export default InterfaceOptions;
