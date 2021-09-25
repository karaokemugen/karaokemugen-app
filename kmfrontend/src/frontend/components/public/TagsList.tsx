import './TagsList.scss';

import i18next from 'i18next';
import React, { Component } from 'react';
import { AutoSizer, CellMeasurer, CellMeasurerCache, Index, IndexRange, InfiniteLoader, List, ListRowProps } from 'react-virtualized';

import { DBKaraTag, DBYear } from '../../../../../src/lib/types/database/kara';
import { DBTag } from '../../../../../src/lib/types/database/tag';
import GlobalContext from '../../../store/context';
import { getTagInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { YEARS } from '../../../utils/tagTypes';
import { eventEmitter } from '../../../utils/tools';
import { View } from '../../types/view';

interface IProps {
	tagType: number;
	changeView: (
		view: View,
		tagType?: number,
		searchValue?: string,
		searchCriteria?: 'year' | 'tag'
	) => void;
}

interface IState {
	tags: TagsElem;
	forceUpdate: boolean;
	filterValue: string;
	scrollToIndex: number;
}

interface TagsElem {
	content: DBTag[];
	infos: {
		count: number,
		from: number,
		to: number
	}
}

const _cache = new CellMeasurerCache({ defaultHeight: 80, fixedWidth: true });
const chunksize = 100;
let timer: any;

class TagsList extends Component<IProps, IState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>

	state = {
		tags: {
			content: [],
			infos: {
				count: 0,
				from: 0,
				to: 0
			}
		},
		forceUpdate: false,
		filterValue: '',
		scrollToIndex: -1
	};

	componentDidMount() {
		this.props.tagType === YEARS.type ? this.getYears() : this.getTags();
		eventEmitter.addChangeListener('playlistContentsUpdatedFromClient', this.playlistContentsUpdatedFromClient);
	}

	componentWillUnmount() {
		eventEmitter.removeChangeListener('playlistContentsUpdatedFromClient', this.playlistContentsUpdatedFromClient);
	}

	playlistContentsUpdatedFromClient = async () => {
		const tags = this.state.tags;
		tags.infos.from = 0;
		this.setState({ filterValue: this.context.globalState.frontendContext.filterValue1, tags, scrollToIndex: 0 });
		this.props.tagType === YEARS.type ? this.getYears() : this.getTags();
	}

	tagsListForceRefresh = () => {
		this.setState({ forceUpdate: !this.state.forceUpdate });
		_cache.clearAll();
	}

	async getTags() {
		try {
			const response = await commandBackend('getTags',
				{
					type: this.props.tagType,
					from: this.state.tags.infos.from,
					size: chunksize,
					filter: this.state.filterValue,
					stripEmpty: true
				});
			let data;
			if (response.infos?.from > 0) {
				data = this.state.tags;
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
			this.setState({ tags: data, scrollToIndex: -1 });
			this.tagsListForceRefresh();
		} catch (e) {
			// already display
		}
	}

	async getYears() {
		const response = await commandBackend('getYears');
		response.content = response.content.map((val: DBYear) => {
			return { tid: val.year, name: val.year, type: [0], karacount: [{ type: 0, count: val.karacount }] };
		});
		this.setState({ tags: response, scrollToIndex: -1 });
	}


	isRowLoaded = ({ index }: Index) => {
		return Boolean(this.state.tags.content[index]);
	}

	loadMoreRows = async ({ startIndex, stopIndex }: IndexRange) => {
		const data = this.state.tags;
		data.infos.from = Math.floor(stopIndex / chunksize) * chunksize;
		this.setState({ tags: data });
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => this.props.tagType === YEARS.type ? this.getYears() : this.getTags(), 1000);
	}

	openSearch = (tid: string) => {
		let searchValue = tid;
		if (this.props.tagType !== YEARS.type) searchValue = `${searchValue}~${this.props.tagType}`;
		this.props.changeView('search', this.props.tagType, searchValue, this.props.tagType === YEARS.type ? 'year' : 'tag');
	}

	rowRenderer = ({ index, isScrolling, key, parent, style }: ListRowProps) => {
		let tag: DBTag;
		if (this.state.tags?.content[index]) {
			tag = this.state.tags.content[index];
			return (
				<CellMeasurer
					cache={_cache}
					columnIndex={0}
					key={key}
					parent={parent}
					rowIndex={index}
				>
					<div className={`tags-item${index % 2 === 0 ? ' even' : ''}`} tabIndex={0}
						key={tag.tid} style={style} onClick={() => this.openSearch(tag.tid)}>
						<div className="title">{
							this.props.tagType === YEARS.type ?
								tag.name :
								getTagInLocale(this.context?.globalState.settings.data, tag as unknown as DBKaraTag)
						}</div>
						<div className="karacount">
							<em>
								{i18next.t('KARAOKE', {
									count: (tag?.karacount as unknown as { count: number, type: number }[])
										?.filter(value => value.type === this.props.tagType).length > 0 ?
										(tag.karacount as unknown as { count: number, type: number }[])
											?.filter(value => value.type === this.props.tagType)[0].count
										: 0
								})}
							</em>
						</div>
					</div>
				</CellMeasurer>
			);
		} else {
			return <div className="tags-item" key={key} style={style}>
				{i18next.t('LOADING')}
			</div>;
		}
	}

	render() {
		return (
			<div className="tags-list">
				<InfiniteLoader
					isRowLoaded={this.isRowLoaded}
					loadMoreRows={this.loadMoreRows}
					rowCount={this.state.tags.infos.count}>
					{({ onRowsRendered, registerChild }) => (
						<AutoSizer>
							{({ height, width }) => {
								return (
									<List
										{...[this.state.forceUpdate]}
										ref={registerChild}
										onRowsRendered={onRowsRendered}
										rowCount={this.state.tags.infos.count}
										rowHeight={_cache.rowHeight}
										rowRenderer={this.rowRenderer}
										height={height}
										width={width}
										scrollToIndex={this.state.scrollToIndex}
									/>);
							}}
						</AutoSizer>
					)}
				</InfiniteLoader>
			</div>
		);
	}
}

export default TagsList;
