import { Button, Cascader, Col, Layout, Radio, Row, Select, Table } from 'antd';
import Title from '../../components/Title';
import i18next from 'i18next';
import { Component } from 'react';
import { Link } from 'react-router-dom';

import { DBKara } from '../../../../../src/lib/types/database/kara';
import GlobalContext from '../../../store/context';
import { getTagInLocale, getTagInLocaleList, getTitleInLocale } from '../../../utils/kara';
import { commandBackend } from '../../../utils/socket';
import { tagTypes } from '../../../utils/tagTypes';

interface PlaylistElem {
	plaid: string;
	name: string;
	karacount?: number;
	flag_current?: boolean;
	flag_public?: boolean;
	flag_visible?: boolean;
}
interface KaraBatchEditState {
	karas: DBKara[];
	tags: any;
	tid?: string;
	playlists: PlaylistElem[];
	plaid?: string;
	action?: 'add' | 'remove';
	type?: number;
	i18nTag: { [key: string]: { [key: string]: string } };
}

class KaraBatchEdit extends Component<unknown, KaraBatchEditState> {
	static contextType = GlobalContext;
	context: React.ContextType<typeof GlobalContext>;

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			tags: [],
			playlists: [],
			i18nTag: {},
		};
	}

	async componentDidMount() {
		const tags = await commandBackend('getTags');
		const playlists = await commandBackend('getPlaylists');
		const options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type].type;

			const option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}_other`),
				children: [],
			};
			for (const tag of tags.content) {
				if (tag.types.length && tag.types.indexOf(typeID) >= 0)
					option.children.push({
						value: tag.tid,
						label: tag.name,
					});
			}
			return option;
		});
		this.setState({ tags: options, playlists: playlists });
	}

	FilterTagCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	};

	changePlaylist = async (plaid: string) => {
		try {
			const karas = await commandBackend('getPlaylistContents', { plaid });
			this.setState({ plaid: plaid, karas: karas.content, i18nTag: karas.i18n });
		} catch (e) {
			// already display
		}
	};

	batchEdit = () => {
		if (this.state.plaid && this.state.action && this.state.tid) {
			commandBackend('editKaras', {
				plaid: this.state.plaid,
				action: this.state.action,
				tid: this.state.tid,
				type: this.state.type,
			});
		}
	};

	render() {
		return (
			<>
				<Title
					title={i18next.t('HEADERS.KARATAG_BATCH_EDIT.TITLE')}
					description={i18next.t('HEADERS.KARATAG_BATCH_EDIT.DESCRIPTION')}
				/>
				<Layout.Content>
					<Row justify="space-between" style={{ flexWrap: 'nowrap' }}>
						<Col flex={'15%'}>
							<Link to="/admin">{i18next.t('KARA.BATCH_EDIT.CREATE_PLAYLIST')}</Link>
						</Col>
						<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
							<label>{i18next.t('KARA.BATCH_EDIT.SELECT_PLAYLIST')}</label>
							<Select
								style={{ maxWidth: '20%', minWidth: '150px' }}
								onChange={this.changePlaylist}
								placeholder={i18next.t('KARA.BATCH_EDIT.SELECT')}
							>
								{this.state.playlists.map(playlist => {
									return (
										<Select.Option key={playlist.plaid} value={playlist.plaid}>
											{playlist.name}
										</Select.Option>
									);
								})}
							</Select>
						</Col>
						<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
							<label>{i18next.t('KARA.BATCH_EDIT.SELECT_ACTION')}</label>
							<Radio
								checked={this.state.action === 'add'}
								onChange={() => this.setState({ action: 'add' })}
							>
								{i18next.t('KARA.BATCH_EDIT.ADD_TAG')}
							</Radio>
							<Radio
								checked={this.state.action === 'remove'}
								onChange={() => this.setState({ action: 'remove' })}
							>
								{i18next.t('KARA.BATCH_EDIT.REMOVE_TAG')}
							</Radio>
						</Col>
						<Col flex={4} style={{ display: 'flex', flexDirection: 'column' }}>
							<label>{i18next.t('KARA.BATCH_EDIT.SELECT_TAG')}</label>
							<Cascader
								style={{ maxWidth: '250px' }}
								options={this.state.tags}
								placeholder={i18next.t('KARA.BATCH_EDIT.SELECT')}
								showSearch={{ filter: this.FilterTagCascaderFilter, matchInputWidth: false }}
								onChange={value => {
									if (value) this.setState({ tid: value[1] as string, type: value[0] as number });
								}}
							/>
						</Col>
						<Col flex={1}>
							<Button onClick={this.batchEdit}>{i18next.t('KARA.BATCH_EDIT.EDIT')}</Button>
						</Col>
					</Row>
					<Table
						dataSource={this.state.karas}
						columns={this.columns}
						rowKey="kid"
						childrenColumnName="childrenColumnName"
					/>
				</Layout.Content>
			</>
		);
	}

	columns = [
		{
			title: i18next.t('TAG_TYPES.LANGS_other'),
			dataIndex: 'langs',
			key: 'langs',
			render: langs => {
				return getTagInLocaleList(this.context.globalState.settings.data, langs, this.state.i18nTag).join(', ');
			},
		},
		{
			title: `${i18next.t('TAG_TYPES.SERIES_other')} / ${i18next.t('KARA.SINGERS_BY')}`,
			dataIndex: 'series',
			key: 'series',
			render: (series, record: DBKara) => {
				return (
					series
						.map(
							serie =>
								getTagInLocale(this.context?.globalState.settings.data, serie, this.state.i18nTag).i18n
						)
						.join(', ') ||
					getTagInLocaleList(this.context.globalState.settings.data, record.singers, this.state.i18nTag).join(
						', '
					)
				);
			},
		},
		{
			title: i18next.t('TAG_TYPES.SONGTYPES_other'),
			dataIndex: 'songtypes',
			key: 'songtypes',
			render: (songtypes, record) => {
				const songorder = record.songorder || '';
				return (
					getTagInLocaleList(this.context.globalState.settings.data, songtypes, this.state.i18nTag).join(
						', '
					) +
						' ' +
						songorder || ''
				);
			},
		},
		{
			title: i18next.t('TAG_TYPES.FAMILIES_other'),
			dataIndex: 'families',
			key: 'families',
			render: families => {
				return getTagInLocaleList(this.context.globalState.settings.data, families, this.state.i18nTag).join(
					', '
				);
			},
		},
		{
			title: i18next.t('KARA.TITLE'),
			dataIndex: 'titles',
			key: 'titles',
			render: (titles, record) =>
				getTitleInLocale(this.context.globalState.settings.data, titles, record.titles_default_language),
		},
		{
			title: i18next.t('TAG_TYPES.VERSIONS_other'),
			dataIndex: 'versions',
			key: 'versions',
			render: versions =>
				getTagInLocaleList(this.context.globalState.settings.data, versions, this.state.i18nTag).join(', '),
		},
		{
			title: i18next.t('KARA.REPOSITORY'),
			dataIndex: 'repository',
			key: 'repository',
		},
	];
}

export default KaraBatchEdit;
