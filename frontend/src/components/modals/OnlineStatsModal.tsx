import axios from 'axios';
import i18next from 'i18next';
import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import RadioButton from '../generic/RadioButton';

interface IState {
	openDetails: boolean;
	stats?: boolean;
	errorTracking?: boolean
}

class OnlineStatsModal extends Component<unknown, IState> {
	constructor(props: unknown) {
		super(props);
		this.state = {
			openDetails: false
		};
	}

	onClick = () => {
		if (this.state.errorTracking !== undefined && this.state.stats !== undefined) {
			axios.put('/settings', {
				setting: {
					Online: {
						Stats: this.state.stats,
						ErrorTracking: this.state.errorTracking
					}
				}
			});
			const element = document.getElementById('modal');
			if (element) ReactDOM.unmountComponentAtNode(element);
		}
	};

	render() {
		return (
			<div className="modal modalPage">
				<div className="modal-dialog">
					<div className="modal-content">
						<div className="modal-header">
							<h4 className="modal-title">{i18next.t('ONLINE_STATS.TITLE')}</h4>
						</div>
						<div className="modal-body">
							<div className="modal-message text">
								<p>{i18next.t('ONLINE_STATS.INTRO')}</p>
							</div>
							<div className="text">
								<a className="btn-link" type="button" onClick={() => this.setState({ openDetails: !this.state.openDetails })}>
									{i18next.t('ONLINE_STATS.DETAILS.TITLE')}
								</a>
								{this.state.openDetails ?
									<React.Fragment>
										<ul>
											<li>{i18next.t('ONLINE_STATS.DETAILS.1')}</li>
											<li>{i18next.t('ONLINE_STATS.DETAILS.2')}</li>
											<li>{i18next.t('ONLINE_STATS.DETAILS.3')}</li>
											<li>{i18next.t('ONLINE_STATS.DETAILS.4')}</li>
											<li>{i18next.t('ONLINE_STATS.DETAILS.5')}</li>
										</ul>
										<p>{i18next.t('ONLINE_STATS.DETAILS.OUTRO')}</p>
										<br />
									</React.Fragment> : null
								}
								<div className="text">
									<p>{i18next.t('ONLINE_STATS.QUESTION')}</p>
								</div>
								<RadioButton
									title={i18next.t('ONLINE_STATS.TITLE')}
									buttons={[
										{
											label: i18next.t('YES'),
											active: this.state.stats,
											onClick: () => this.setState({ stats: true }),
										},
										{
											label: i18next.t('NO'),
											active: this.state.stats === false,
											onClick: () => this.setState({ stats: false }),
										}
									]}
								></RadioButton>
								<br />
								<div className="text">
									<p>{i18next.t('ONLINE_STATS.ERROR')}</p>
								</div>
								<RadioButton
									title={i18next.t('ONLINE_STATS.ERROR_TRACKING')}
									buttons={[
										{
											label: i18next.t('YES'),
											active: this.state.errorTracking,
											onClick: () => this.setState({ errorTracking: true }),
										},
										{
											label: i18next.t('NO'),
											active: !this.state.errorTracking === false,
											onClick: () => this.setState({ errorTracking: false }),
										}
									]}
								></RadioButton>
								<br />
								{i18next.t('ONLINE_STATS.CHANGE')}
							</div >
						</div >
						<div className="modal-footer">
							<button type="button" className="btn btn-action btn-default ok" onClick={() => this.onClick()}>
								{i18next.t('ONLINE_STATS.CONFIRM')}
							</button>
						</div>
					</div >
				</div >
			</div >
		);
	}
}

export default OnlineStatsModal;
