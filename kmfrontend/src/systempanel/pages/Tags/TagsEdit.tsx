import { Layout } from 'antd';
import i18next from 'i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { DBTag } from '../../../../../src/lib/types/database/tag';
import { commandBackend } from '../../../utils/socket';
import TagsForm from './TagsForm';

function TagEdit() {
	const navigate = useNavigate();
	const { tid } = useParams();

	const [tag, setTag] = useState<DBTag>();
	const [tags, setTags] = useState<DBTag[]>([]);
	const [save, setSave] = useState<(tag: DBTag) => void>();

	const saveNew = async (tag: DBTag) => {
		try {
			await commandBackend('addTag', tag, true, 300000);
			navigate('/system/tags');
		} catch (e) {
			// already display
		}
	};

	const saveUpdate = async (tag: DBTag) => {
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
				setSave(saveUpdate);
			} catch (e) {
				// already display
			}
		} else {
			setSave(saveNew);
		}
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
			<Layout.Header>
				<div className="title">{i18next.t(tid ? 'HEADERS.TAG_EDIT.TITLE' : 'HEADERS.TAG_NEW.TITLE')}</div>
				<div className="description">
					{i18next.t(tid ? 'HEADERS.TAG_EDIT.DESCRIPTION' : 'HEADERS.TAG_NEW.DESCRIPTION')}
				</div>
			</Layout.Header>
			<Layout.Content>
				{save && (
					<TagsForm tag={tag} tags={tags} save={save} mergeAction={handleTagMerge} handleCopy={handleCopy} />
				)}
			</Layout.Content>
		</>
	);
}

export default TagEdit;
