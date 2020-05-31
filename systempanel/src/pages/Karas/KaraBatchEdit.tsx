import React, { Component } from 'react';
import { Layout, Table, Cascader, Select, Radio, Button, Col, Row } from 'antd';
import { getTagInLocaleList, getSerieLanguage } from "../../utils/kara";
import i18next from 'i18next';
import { DBKara } from '../../../../src/lib/types/database/kara';
import GlobalContext from '../../store/context';
import Axios from 'axios';
import { tagTypes } from '../../utils/tagTypes';

interface PlaylistElem {
	playlist_id: number;
	name: string;
	karacount?: number;
	flag_current?: boolean;
	flag_public?: boolean;
	flag_visible?: boolean;
}
interface KaraBatchEditState {
	karas: DBKara[],
	tags: any,
	tid?: string,
	playlists: PlaylistElem[],
	playlist_id?: number,
	action?: 'add' | 'remove',
	type?: number
	i18nTag: { [key: string]: { [key: string]: string } };
}

class KaraBatchEdit extends Component<{}, KaraBatchEditState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {
			karas: [],
			tags: [],
			playlists: [],
			i18nTag: {}
		};
	}

	async componentDidMount() {
		let tags = await Axios.get('/tags');
		let playlists = await Axios.get('/playlists');
		let options = Object.keys(tagTypes).map(type => {
			const typeID = tagTypes[type];

			let option = {
				value: typeID,
				label: i18next.t(`TAG_TYPES.${type}`),
				children: []
			}
			tags.data.content.forEach(tag => {
				if (tag.types.length && tag.types.indexOf(typeID) >= 0)
					option.children.push({
						value: tag.tid,
						label: tag.name,
					})
			})
			return option;
		})
		this.setState({ tags: options, playlists: playlists.data });
	}


	FilterTagCascaderFilter = function (inputValue, path) {
		return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
	}

	changePlaylist = async (value: number) => {
		let karas = await Axios.get(`/playlists/${value}/karas`);
		this.setState({ playlist_id: value, karas: karas.data.content, i18nTag: karas.data.i18n });
	}

	batchEdit = () => {
		if (this.state.playlist_id && this.state.action && this.state.tid) {
			Axios.put('/karas/batch', {
				playlist_id: this.state.playlist_id,
				action: this.state.action,
				tid: this.state.tid,
				type: this.state.type
			})
		}
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Row justify="space-between" style={{ flexWrap: 'nowrap' }}>
							<Col flex={'15%'}>
								<a href={window.location.port === '3000' ? `${window.location.protocol}//${window.location.hostname}:1337/admin` : 
									`${window.location.origin}/admin`}>{i18next.t('KARA.BATCH_EDIT.CREATE_PLAYLIST')}</a>
							</Col>
							<Col flex={4} >
								<label style={{marginRight: '10px'}}>{i18next.t('KARA.BATCH_EDIT.SELECT_PLAYLIST')}</label>
								<Select style={{ maxWidth: '20%', minWidth: '150px' }} onChange={this.changePlaylist}
									placeholder={i18next.t('KARA.BATCH_EDIT.SELECT')}>
									{this.state.playlists.map(playlist => {
										return <Select.Option key={playlist.playlist_id} value={playlist.playlist_id}>{playlist.name}</Select.Option>
									})
									}
								</Select>
							</Col>
							<Col flex={4} style={{marginTop: '5px'}}>
								<label style={{marginRight: '10px'}}>{i18next.t('KARA.BATCH_EDIT.SELECT_ACTION')}</label>
								<Radio checked={this.state.action === 'add'} onChange={() => this.setState({ action: 'add' })}>
									{i18next.t('KARA.BATCH_EDIT.ADD_TAG')}
								</Radio>
								<Radio checked={this.state.action === 'remove'} onChange={() => this.setState({ action: 'remove' })}>
									{i18next.t('KARA.BATCH_EDIT.REMOVE_TAG')}
								</Radio>
							</Col>
							<Col flex={4}>
								<label style={{marginRight: '10px'}}>{i18next.t('KARA.BATCH_EDIT.SELECT_TAG')}</label>
								<Cascader style={{minWidth: '250px'}} options={this.state.tags} placeholder={i18next.t('KARA.BATCH_EDIT.SELECT')}
									showSearch={{ filter: this.FilterTagCascaderFilter, matchInputWidth: false }}
									onChange={(value) => this.setState({ tid: value[1] as string, type: value[0] as number })} />
							</Col>
							<Col flex={1}>
								<Button onClick={this.batchEdit}>{i18next.t('KARA.BATCH_EDIT.EDIT')}</Button>
							</Col>
						</Row>
					</Layout.Header>
					<Layout.Content>
						<Table
							dataSource={this.state.karas}
							columns={this.columns}
							rowKey='kid'
						/>
					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	columns = [{
		title: i18next.t('KARA.LANGUAGES'),
		dataIndex: 'langs',
		key: 'langs',
		render: langs => {
			return getTagInLocaleList(langs, this.state.i18nTag).join(', ')
		}
	}, {
		title: `${i18next.t('KARA.SERIES')} / ${i18next.t('KARA.SINGERS')}`,
		dataIndex: 'series',
		key: 'series',
		render: (series, record: DBKara) => {
			return series.map(serie => getSerieLanguage(this.context.globalState.settings.data, serie, record.langs[0].name, this.state.i18nTag)).join(', ')
				|| getTagInLocaleList(record.singers, this.state.i18nTag).join(', ');
		}
	}, {
		title: i18next.t('KARA.SONGTYPES'),
		dataIndex: 'songtypes',
		key: 'songtypes',
		render: (songtypes, record) => {
			const songorder = record.songorder || '';
			return getTagInLocaleList(songtypes, this.state.i18nTag).join(', ') + ' ' + songorder || '';
		}
	}, {
		title: i18next.t('KARA.FAMILIES'),
		dataIndex: 'families',
		key: 'families',
		render: (families, record) => {
			return getTagInLocaleList(families, this.state.i18nTag).join(', ');
		}
	}, {
		title: i18next.t('KARA.TITLE'),
		dataIndex: 'title',
		key: 'title'
	}, {
		title: i18next.t('KARA.REPOSITORY'),
		dataIndex: 'repository',
		key: 'repository'
	}];
}

export default KaraBatchEdit;
