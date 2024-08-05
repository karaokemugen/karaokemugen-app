import i18next from 'i18next';
import { useContext } from 'react';

import { DBKara } from '../../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../../store/context';
import { commandBackend } from '../../../../utils/socket';
import { PLCCallback } from '../../../../utils/tools';

interface Props {
	kara: DBKara;
}

export default function AddKaraButton(props: Props) {
	const context = useContext(GlobalContext);

	const addKara = async () => {
		let response;
		try {
			response = await commandBackend('addKaraToPublicPlaylist', {
				requestedby: context.globalState.auth.data.username,
				kids: [props.kara.kid],
			});
		} catch (e) {
			// already display
		}
		PLCCallback(response, context, props.kara);
	};

	return (
		<button type="button" onClick={addKara} className="btn btn-action">
			<i className="fas fa-fw fa-plus" />
			<span>{i18next.t('TOOLTIP_ADDKARA')}</span>
		</button>
	);
}
