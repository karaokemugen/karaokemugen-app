import i18next from 'i18next';
import { useState } from 'react';

import { useDeferredEffect } from '../../../../utils/hooks';
import { isRemote } from '../../../../utils/socket';

interface Props {
	togglePreview: () => void
	preview: boolean
	repository: string
}

export default function ShowVideoButton(props: Props) {
	return isRemote() && !/\./.test(props.repository) ? null : (
		<button type="button" className="btn btn-action" onClick={props.togglePreview}>
			<i className="fas fa-fw fa-video"/>
			<span>{props.preview ? i18next.t('KARA_DETAIL.HIDE_VIDEO') : i18next.t('KARA_DETAIL.SHOW_VIDEO')}</span>
		</button>
	);
}
