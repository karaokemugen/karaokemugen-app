import { Layout } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Tag } from '../../../../../src/lib/types/tag';
import { commandBackend } from '../../../utils/socket';
import Title from '../../components/Title';
import TagsForm from './TagsForm';

function TagEdit() {
	const navigate = useNavigate();
	const { tid } = useParams();

	const [tag, setTag] = useState<Tag>();
	const [tags, setTags] = useState<Tag[]>([]);
	const [loaded, setLoaded] = useState(false);

	const saveUpdate = async (tag: Tag) => {
		try {
			await commandBackend('editTag', tag, true, 300000);
			navigate('/system/tags');
		} catch (_) {
			// already display
		}
	};

	const handleTagDelete = async (tid: string) => {
		try {
			await commandBackend('deleteTag', { tids: [tid] }, true);
			navigate('/system/tags/');
		} catch (_) {
			// already display
		}
	};

	const handleTagMerge = async (tid1: string, tid2: string) => {
		try {
			await commandBackend('mergeTags', { tid1, tid2 }, true, 300000);
			navigate('/system/tags/');
		} catch (_) {
			// already display
		}
	};

	const loadTag = async () => {
		try {
			let res = await commandBackend('getTag', { tid }, true);
			const tagData = { ...res };
			tagData.tid = tid;
			res = await commandBackend('getTags');
			setTags(res.content);
			setTag(tagData);
		} catch (_) {
			// already display
		}
		setLoaded(true);
	};

	const handleCopy = async (tid, repo) => {
		await commandBackend('copyTagToRepo', { repo, tid }, true);
		navigate('/system/tags');
	};

	useEffect(() => {
		loadTag();
	}, []);

	return (
		<>
			<Title
				title={i18next.t('HEADERS.TAG_EDIT.TITLE')}
				description={i18next.t('HEADERS.TAG_EDIT.DESCRIPTION')}
			/>
			<Layout.Content>
				{loaded && (
					<TagsForm
						tag={tag}
						tags={tags}
						save={saveUpdate}
						mergeAction={handleTagMerge}
						deleteAction={handleTagDelete}
						handleCopy={handleCopy}
					/>
				)}
			</Layout.Content>
		</>
	);
}

export default TagEdit;
