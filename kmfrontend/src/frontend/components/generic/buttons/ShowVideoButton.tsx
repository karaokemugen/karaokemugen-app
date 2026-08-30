import { faVideo } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';

import { isRemote } from '../../../../utils/socket';

interface Props {
	togglePreview: () => void;
	preview: boolean;
	repository: string;
}

export default function ShowVideoButton(props: Props) {
	return isRemote() && !/\./.test(props.repository) ? null : (
		<button type="button" className="btn btn-action" onClick={props.togglePreview}>
			<FontAwesomeIcon icon={faVideo} />
			<span>{props.preview ? i18next.t('KARA_DETAIL.HIDE_VIDEO') : i18next.t('KARA_DETAIL.SHOW_VIDEO')}</span>
		</button>
	);
}
