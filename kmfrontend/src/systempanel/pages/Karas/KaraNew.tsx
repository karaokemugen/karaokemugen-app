import { Layout } from 'antd';
import i18next from 'i18next';
import { useNavigate } from 'react-router-dom';

import { addListener, removeListener } from '../../../utils/electron';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import KaraForm from './KaraForm';
import { useEffect } from 'react';
import type { EditedKara } from '../../../../../src/lib/types/kara';
import { WS_CMD } from '../../../utils/ws';

function KaraNew() {
	const navigate = useNavigate();

	const saveNew = async (kara: EditedKara) => {
		try {
			await commandBackend(WS_CMD.CREATE_KARA, kara, true, 300000);
			addListener();
			navigate('/system/karas');
		} catch (_) {
			// already display
		}
	};

	useEffect(() => {
		removeListener();
	}, []);

	return (
		<>
			<Title
				title={i18next.t('HEADERS.KARAOKE_NEW.TITLE')}
				description={i18next.t('HEADERS.KARAOKE_NEW.DESCRIPTION')}
			/>
			<Layout.Content>
				<KaraForm save={saveNew} />
			</Layout.Content>
		</>
	);
}

export default KaraNew;
