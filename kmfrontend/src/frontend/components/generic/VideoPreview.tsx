import { useContext } from 'react';
import { useAsyncMemo } from 'use-async-memo';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import { isRemote } from '../../../utils/socket';
import { Scope } from '../../types/scope';
import { isRepoOnline } from '../../../utils/tools';
import GlobalContext from '../../../store/context';

interface Props {
	show: boolean;
	kara: DBKara;
	scope: Scope;
}

export default function VideoPreview(props: Props) {
	const context = useContext(GlobalContext);

	const videoLink = useAsyncMemo<string>(
		async () => {
			if (isRepoOnline(context, props.kara.repository)) {
				const { subchecksum, mediasize } = await fetch(
					`https://${props.kara.repository}/api/karas/${props.kara.kid}`
				).then(r => r.json());
				if (props.kara.mediasize !== mediasize) return null;
				else
					return `https://${props.kara.repository}/hardsubs/${props.kara.kid}.${props.kara.mediasize}.${subchecksum}.mp4`;
			} else return null;
		},
		[context.globalState.settings.data.config.System.Repositories],
		isRemote() || props.kara.download_status !== 'DOWNLOADED'
			? `https://${props.kara.repository}/downloads/medias/${props.kara.mediafile}`
			: `/medias/${props.kara.mediafile}`
	);

	return props.show ? (
		<video
			src={videoLink}
			controls={true}
			autoPlay={true}
			loop={true}
			playsInline={true}
			onLoadStart={e => (e.currentTarget.volume = 0.5)}
			className={`modal-video${props.scope === 'public' ? ' public' : ''}`}
		/>
	) : null;
}
