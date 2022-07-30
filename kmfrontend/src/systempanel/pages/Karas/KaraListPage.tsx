import { Layout } from 'antd';
import i18next from 'i18next';
import KaraList from '../../components/KaraList';

function KaraListPage() {
	return (
		<>
			<Layout.Header>
				<div className="title">{i18next.t('HEADERS.KARAOKE_LIST.TITLE')}</div>
				<div className="description">{i18next.t('HEADERS.KARAOKE_LIST.DESCRIPTION')}</div>
			</Layout.Header>
			<Layout.Content>
				<KaraList />
			</Layout.Content>
		</>
	);
}

export default KaraListPage;
