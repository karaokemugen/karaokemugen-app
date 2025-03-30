import './CheckBoxTag.scss';

import { Checkbox, Col, Row } from 'antd';
import { useContext, useEffect, useState } from 'react';
import GlobalContext from '../../../store/context';
import { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { commandBackend } from '../../../utils/socket';
import { getTagInLocale } from '../../../utils/kara';
import { TagTypeNum } from '../../../../../src/lib/types/tag';

interface AutocompleteTagProps {
	onChange: (e: unknown[]) => void;
	tagType?: TagTypeNum;
	value?: DBKaraTag[];
}

export default function CheckBoxTag(props: AutocompleteTagProps) {
	const context = useContext(GlobalContext);
	const [value, setValue] = useState(props.value || []);
	const [tags, setTags] = useState<DBKaraTag[]>([]);

	useEffect(() => {
		search();
	}, []);

	const getTags = async (type: number) => {
		const tags = await commandBackend('getTags', {
			type: [type],
		});
		return tags?.content || [];
	};

	const search = async () => {
		const newTags = await getTags(props.tagType);
		setTags(sortByProp(newTags, 'text'));
	};

	const onCheck = val => {
		const updatedTags = [];
		for (const element of val) {
			const tag = tags.filter(tag => element === tag.tid)[0];
			updatedTags.push(tag);
		}
		setValue(updatedTags);
		if (props.onChange) props.onChange(updatedTags);
	};

	const sortByProp = (array, val) => {
		if (Array.isArray(array)) {
			return array.sort((a, b) => {
				return a[val] > b[val] ? 1 : a[val] < b[val] ? -1 : 0;
			});
		} else {
			return [];
		}
	};

	const tids = value.map(tag => tag.tid);
	return (
		<Checkbox.Group className="checkbox-tag-form" value={tids} style={{ width: '100%' }} onChange={onCheck}>
			<Row>
				{tags.map((tag: DBKaraTag) => {
					const tagi18n = getTagInLocale(context?.globalState.settings.data, tag);
					const desc = tagi18n.description || '';
					return (
						<Col
							xs={{ span: 10 }}
							sm={{ span: 10 }}
							md={{ span: 8 }}
							xl={{ span: 6 }}
							key={tag.tid || tag.name}
							title={tag.aliases?.join(', ')}
						>
							<Checkbox value={tag.tid} style={{ height: '100%', paddingBottom: '0.3em' }}>
								<div>{tagi18n.i18n}</div>
								{desc ? <span style={{ fontSize: 11 }}>{desc}</span> : null}
							</Checkbox>
						</Col>
					);
				})}
			</Row>
		</Checkbox.Group>
	);
}
