import { Layout } from 'antd';
import i18next from 'i18next';
import { useNavigate } from 'react-router-dom';

import { Tag } from '../../../../../src/lib/types/tag';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import TagsForm from './TagsForm';

function TagNew() {
	const navigate = useNavigate();

	const saveNew = async (tag: Tag) => {
		try {
			await commandBackend('addTag', tag, true, 300000);
			navigate('/system/tags');
		} catch (_) {
			// already display
		}
	};

	return (
		<>
			<Title title={i18next.t('HEADERS.TAG_NEW.TITLE')} description={i18next.t('HEADERS.TAG_NEW.DESCRIPTION')} />
			<Layout.Content>
				<TagsForm tags={[]} save={saveNew} />
			</Layout.Content>
		</>
	);
}

export default TagNew;
