import './TagsList.scss';

import i18next from 'i18next';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ListRange, Virtuoso } from 'react-virtuoso';

import { DBKaraTag, DBYear } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
import GlobalContext from '../../../store/context';
import { useDeferredEffect } from '../../../utils/hooks';
import { getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { YEARS } from '../../../utils/tagTypes';

const chunksize = 100;
let timer: any;

function TagsList() {
	const navigate = useNavigate();
	const context = useContext(GlobalContext);
	const { tagType: tagReq } = useParams();
	const tagType = parseInt(tagReq);
	const [forceUpdate, setForceUpdate] = useState(false);
	const [tags, setTags] = useState({
		content: [],
		infos: {
			count: 0,
			from: 0,
			to: 0,
		},
	});

	const getTags = async (from: number) => {
		try {
			const response = await commandBackend('getTags', {
				type: [tagType],
				from,
				size: chunksize,
				filter: context.globalState.frontendContext.filterValue1,
				stripEmpty: true,
			});
			let data;
			if (response.infos?.from > 0) {
				data = tags;
				if (response.infos.from < data.content.length) {
					for (let index = 0; index < response.content.length; index++) {
						data.content[response.infos.from + index] = response.content[index];
					}
				} else {
					if (response.infos.from > data.content.length) {
						const nbCellToFill = data.infos.from - data.content.length;
						for (let index = 0; index < nbCellToFill; index++) {
							data.content.push(undefined);
						}
					}
					data.content.push(...response.content);
				}
				data.infos = response.infos;
			} else {
				data = response;
			}
			setTags(data);
			setForceUpdate(!forceUpdate);
		} catch (_) {
			// already display
		}
	};

	const getYears = async () => {
		const response = await commandBackend('getYears');
		response.content = response.content.map((val: DBYear) => {
			return { tid: val.year, name: val.year, type: [0], karacount: [{ type: 0, count: val.karacount }] };
		});
		setTags(response);
	};

	const isRowLoaded = index => {
		return !!tags?.content[index];
	};

	const loadMoreRows = async ({ endIndex }: ListRange) => {
		if (isRowLoaded(endIndex)) return;
		if (timer) clearTimeout(timer);
		timer = setTimeout(
			() => (tagType === YEARS.type ? getYears() : getTags(Math.floor(endIndex / chunksize) * chunksize)),
			1000
		);
	};

	const openSearch = (tid: string) => {
		let searchValue = tid;
		if (tagType !== YEARS.type) searchValue = `${searchValue}~${tagType}`;
		navigate(`/public/search/${tagType === YEARS.type ? 'year' : 'tag'}/${searchValue}`);
	};

	const Item = useCallback(
		({ index }: { index: number }) => {
			let tag: DBTag;
			if (tags?.content[index]) {
				tag = tags.content[index];
				return (
					<div
						className={`tags-item${index % 2 === 0 ? ' even' : ''}`}
						tabIndex={0}
						key={tag.tid}
						onClick={() => openSearch(tag.tid)}
					>
						<div className="title">
							{tagType === YEARS.type
								? tag.name
								: getTagInLocale(context?.globalState.settings.data, tag as unknown as DBKaraTag).i18n}
						</div>
						<div className="karacount">
							<em>
								{i18next.t('KARAOKE', {
									count:
										(tag?.karacount as unknown as { count: number; type: number }[])?.filter(
											value => value.type === tagType
										).length > 0
											? (tag.karacount as unknown as { count: number; type: number }[])?.filter(
													value => value.type === tagType
												)[0].count
											: 0,
								})}
							</em>
						</div>
					</div>
				);
			} else {
				return (
					<div className="tags-item" key={index}>
						{i18next.t('LOADING')}
					</div>
				);
			}
		},
		[tags?.infos.to]
	);

	useDeferredEffect(() => {
		tagType === YEARS.type ? getYears() : getTags(0);
	}, [context.globalState.frontendContext.filterValue1]);

	useEffect(() => {
		tagType === YEARS.type ? getYears() : getTags(0);
	}, []);

	return (
		<div className="tags-list">
			<Virtuoso
				style={{ flex: '1 0 auto' }}
				itemContent={index => <Item index={index} />}
				totalCount={tags.infos.count}
				rangeChanged={loadMoreRows}
			/>
		</div>
	);
}

export default TagsList;
