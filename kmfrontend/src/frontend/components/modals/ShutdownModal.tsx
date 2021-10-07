import './ShutdownModal.scss';

import i18next from 'i18next';
import React, { Component } from 'react';

interface IProps {
	close: () => void;
}

class ShutdownModal extends Component<IProps, unknown> {
	render() {
		return (
			<div className="shutdown-popup">
				<div className="noise-wrapper">
					<div className="noise" />
				</div>
				<div className="shutdown-popup-text">
					{i18next.t('SHUTDOWN_POPUP')}
					<br />
					{'·´¯`(>_<)´¯`·'}
				</div>
				<button
					title={i18next.t('TOOLTIP_CLOSEPARENT')}
					className="closeParent btn btn-action"
					onClick={this.props.close}
				>
					<i className="fas fa-times" />
				</button>
			</div>
		);
	}
}

export default ShutdownModal;
