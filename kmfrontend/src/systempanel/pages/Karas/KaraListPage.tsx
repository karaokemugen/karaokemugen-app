import { Layout } from 'antd';
import Title from '../../components/Title';
import i18next from 'i18next';
import KaraList from '../../components/KaraList';

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
