import { EditOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import i18next from 'i18next';

import { Kara } from '../../../../src/lib/types/kara';
import { commandBackend } from '../../utils/socket';

interface IProps {
	kara: Kara;
	showOnlyIfDownloaded?: boolean;
}

export default function OpenLyricsFileButton({ kara, showOnlyIfDownloaded = true }: IProps): JSX.Element {
	const { kid, download_status } = kara;
	if (!showOnlyIfDownloaded || download_status === 'DOWNLOADED') {
		return (
			<Button
				type="primary"
				icon={<EditOutlined />}
				onClick={async () => commandBackend('openLyricsFile', { kid: kid })}
			>
				{i18next.t('KARA.LYRICS_FILE_OPEN')}
			</Button>
		);
	}
	return null;
}
