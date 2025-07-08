import { EditOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import i18next from 'i18next';

import { DBKara } from '../../../../src/lib/types/database/kara';
import { commandBackend } from '../../utils/socket';
import { WS_CMD } from '../../utils/ws';

interface IProps {
	kara: DBKara;
	showOnlyIfDownloaded?: boolean;
}

export default function OpenLyricsFileButton({ kara, showOnlyIfDownloaded = true }: IProps): JSX.Element {
	const { kid, download_status } = kara;
	if (!showOnlyIfDownloaded || download_status === 'DOWNLOADED') {
		return (
			<Button
				type="primary"
				icon={<EditOutlined />}
				onClick={() => commandBackend(WS_CMD.OPEN_LYRICS_FILE, { kid: kid }).catch(() => {})}
			>
				{i18next.t('KARA.LYRICS_FILE_OPEN')}
			</Button>
		);
	}
	return null;
}
