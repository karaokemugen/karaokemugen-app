import './ShutdownModal.scss';

import { faTimes } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';

interface IProps {
	close: () => void;
}

function ShutdownModal(props: IProps) {
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
				onClick={props.close}
			>
				<FontAwesomeIcon icon={faTimes} />
			</button>
		</div>
	);
}

export default ShutdownModal;
