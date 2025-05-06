import './CheckBoxTag.scss';

import { Checkbox, Col, Row } from 'antd';
import { useContext, useState } from 'react';
import GlobalContext from '../../../store/context';
import { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import { getTagInLocale } from '../../../utils/kara';

interface AutocompleteTagProps {
	onChange: (e: unknown[]) => void;
	tags: DBKaraTag[];
	value?: DBKaraTag[];
}

export default function CheckBoxTag(props: AutocompleteTagProps) {
	const context = useContext(GlobalContext);
	const [value, setValue] = useState(props.value || []);

	const onCheck = val => {
		const updatedTags = [];
		for (const element of val) {
			const tag = props.tags.filter(tag => element === tag.tid)[0];
			updatedTags.push(tag);
		}
		setValue(updatedTags);
		if (props.onChange) props.onChange(updatedTags);
	};

	const tids = value.map(tag => tag.tid);
	return (
		<Checkbox.Group className="checkbox-tag-form" value={tids} style={{ width: '100%' }} onChange={onCheck}>
			<Row>
				{props.tags.map((tag: DBKaraTag) => {
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
