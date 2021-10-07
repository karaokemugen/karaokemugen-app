import './Loading.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

import { isElectron } from '../electron';

interface IState {
	showLoadingText: boolean
}

class Loading extends Component<Record<never, never>, IState> {

	timeout: NodeJS.Timeout

	constructor(props) {
		super(props);
		this.state = {
			showLoadingText: false
		};
	}

	componentDidMount() {
		this.timeout = setTimeout(() => {
			this.setState({ showLoadingText: true });
		}, 1000);
	}

	componentWillUnmount() {
		clearTimeout(this.timeout);
	}

	render() {
		return (
			<div className="loading-container">
				{
					this.state.showLoadingText ?
						<>
							<span className="header">{i18next.t('LOADING')}</span>
							<span>{isElectron() ? i18next.t('LOADING_SUBTITLE_ELECTRON'):i18next.t('LOADING_SUBTITLE')}</span>
						</>:null
				}
			</div>
		);
	}
}

export default Loading;
