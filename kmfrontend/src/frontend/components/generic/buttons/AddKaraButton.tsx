import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import i18next from 'i18next';
import { useContext, useState } from 'react';

import { DBKara } from '../../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../../store/context';
import { commandBackend } from '../../../../utils/socket';
import { PLCCallback } from '../../../../utils/tools';
import { WS_CMD } from '../../../../utils/ws.mjs';

interface Props {
	kara: DBKara;
	scope: 'admin' | 'public';
}

export default function AddKaraButton(props: Props) {
	const context = useContext(GlobalContext);
	const [isAdding, setIsAdding] = useState(false);

	const addKara = async () => {
		if (isAdding) return;
		setIsAdding(true);
		let response;
		try {
			response = await commandBackend(WS_CMD.ADD_KARA_TO_PUBLIC_PLAYLIST, {
				kids: [props.kara.kid],
			});
		} catch (_) {
			// already display
		} finally {
			setIsAdding(false);
		}
		PLCCallback(response, context, props.kara, props.scope);
	};

	return (
		<button type="button" onClick={addKara} disabled={adding} className="btn btn-action">
			<FontAwesomeIcon icon={faPlus} />
			<span>{i18next.t('TOOLTIP_ADDKARA')}</span>
		</button>
	);
}
