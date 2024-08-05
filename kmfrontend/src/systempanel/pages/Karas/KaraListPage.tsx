import { Layout } from 'antd';
import i18next from 'i18next';

import KaraList from '../../components/KaraList';
import Title from '../../components/Title';

function KaraListPage() {
	return (
		<>
			<Title
				title={i18next.t('HEADERS.KARAOKE_LIST.TITLE')}
				description={i18next.t('HEADERS.KARAOKE_LIST.DESCRIPTION')}
			/>
			<Layout.Content>
				<KaraList />
			</Layout.Content>
		</>
	);
}

export default KaraListPage;
