import { Layout } from 'antd';
import Title from '../../components/Title';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Tag } from '../../../../../src/lib/types/tag';

import { commandBackend } from '../../../utils/socket';
import TagsForm from './TagsForm';

function TagEdit() {
	const navigate = useNavigate();
	const { tid } = useParams();

	const [tag, setTag] = useState<Tag>();
	const [tags, setTags] = useState<Tag[]>([]);
	const [loaded, setLoaded] = useState(false);

	const saveNew = async (tag: Tag) => {
		try {
			await commandBackend('addTag', tag, true, 300000);
			navigate('/system/tags');
		} catch (e) {
			// already display
		}
	};

	const saveUpdate = async (tag: Tag) => {
		try {
			await commandBackend('editTag', tag, true, 300000);
			navigate('/system/tags');
		} catch (e) {
			// already display
		}
	};

	const handleTagMerge = async (tid1: string, tid2: string) => {
		await commandBackend('mergeTags', { tid1, tid2 }, true, 300000);
		navigate('/system/tags/');
	};

	const loadTag = async () => {
		if (tid) {
			try {
				let res = await commandBackend('getTag', { tid }, true);
				const tagData = { ...res };
				tagData.tid = tid;
				res = await commandBackend('getTags');
				setTags(res.content);
				setTag(tagData);
			} catch (e) {
				// already display
			}
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
				title={i18next.t(tid ? 'HEADERS.TAG_EDIT.TITLE' : 'HEADERS.TAG_NEW.TITLE')}
				description={i18next.t(tid ? 'HEADERS.TAG_EDIT.DESCRIPTION' : 'HEADERS.TAG_NEW.DESCRIPTION')}
			/>
			<Layout.Content>
				{loaded && (
					<TagsForm
						tag={tag}
						tags={tags}
						save={tid ? saveUpdate : saveNew}
						mergeAction={handleTagMerge}
						handleCopy={handleCopy}
					/>
				)}
			</Layout.Content>
		</>
	);
}

export default TagEdit;
