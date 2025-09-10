import i18next from 'i18next';

import { DBKara } from '../../../../../../src/lib/types/database/kara';
import { DBPLCInfo } from '../../../../../../src/types/database/playlist';
import { commandBackend } from '../../../../utils/socket';
import { WS_CMD } from '../../../../utils/ws';

interface Props {
	kara: DBKara | DBPLCInfo;
	wide?: boolean;
	updateKara?: () => void;
}

export default function UpvoteKaraButton(props: Props) {
	const upvoteKara = e => {
		e.stopPropagation();
		const plc_id = props.kara.public_plc_id[0];
		const data = props.kara.flag_upvoted ? { downvote: true, plc_id: plc_id } : { plc_id: plc_id };
		commandBackend(WS_CMD.VOTE_PLC, data).catch(() => {});
		props.updateKara && props.updateKara();
	};

	return (
		<button
			title={props.wide ? '' : i18next.t('TOOLTIP_UPVOTE')}
			className={`btn btn-action karaLineButton upvoteKara`}
			onClick={upvoteKara}
			disabled={props.kara.my_public_plc_id?.length > 0}
		>
			<i className={`fas fa-thumbs-up ${props.kara?.flag_upvoted ? 'currentUpvote' : ''}`} />
			{props.wide ? i18next.t('TOOLTIP_UPVOTE') : ''}
		</button>
	);
}
