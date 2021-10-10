import './InlineTag.scss';

import i18next from 'i18next';
import { useContext, useEffect, useRef, useState } from 'react';

import { DBKaraTag } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { View } from '../../types/view';

interface Props {
	tag: DBKaraTag;
	className?: string;
	scope: 'admin' | 'public';
	tagType: number;
	changeView: (view: View, tagType?: number, searchValue?: string, searchCriteria?: 'year' | 'tag') => void;
}

export default function InlineTag(props: Props) {
	const [showPopup, setShowPopup] = useState(false);
	const [count, setCount] = useState(0);
	const node: any = useRef();

	const goToTagSearch = () => {
		const searchValue = `${props.tag.tid}~${props.tagType}`;
		props.changeView('search', props.tagType, searchValue, 'tag');
	};

	const getTag = async () => {
		const res = await commandBackend('getTag', { tid: props.tag.tid });
		const count = Array.isArray(res.karacount)
			? res.karacount.filter((karacount: any) => karacount.type === props.tagType)
			: [];
		if (count.length > 0) setCount(count[0].count);
	};

	const handleClick = (e: any) => {
		if (node.current.contains(e.target)) {
			// inside click
			return;
		}
		// outside click
		setShowPopup(false);
	};

	useEffect(() => {
		// add when mounted
		document.addEventListener('mousedown', handleClick);
		// return function to be called when unmounted
		return () => {
			document.removeEventListener('mousedown', handleClick);
		};
	});

	useEffect(() => {
		getTag();
	}, []);

	const context = useContext(GlobalContext);

	return (
		<div
			className={`inline-tag ${
				props.scope === 'public' && context?.globalState.settings.data.config?.Frontend?.Mode === 2
					? 'public'
					: ''
			}`}
			ref={node}
		>
			<span
				className={props.className}
				onClick={() => {
					if (props.scope === 'public' && context?.globalState.settings.data.config?.Frontend?.Mode === 2)
						setShowPopup(!showPopup);
				}}
			>
				{getTagInLocale(context.globalState.settings.data, props.tag)}
			</span>
			{showPopup ? (
				<div className="tag-popup">
					<p className="tag-name">{getTagInLocale(context.globalState.settings.data, props.tag)}</p>
					<p className="tag-stat">{i18next.t('INLINE_TAG.COUNT', { count: count })}</p>
					<p className="tag-action">
						<button className="btn" onClick={goToTagSearch}>
							<i className="fas fa-fw fa-search" />
							{i18next.t('INLINE_TAG.SEARCH', {
								tag: getTagInLocale(context.globalState.settings.data, props.tag),
							})}
						</button>
					</p>
				</div>
			) : null}
		</div>
	);
}
