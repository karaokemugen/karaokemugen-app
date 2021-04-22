import { Button, Input, InputNumber, Layout, Select,Table } from 'antd';
import i18next from 'i18next';
import React, { Component } from 'react';

import { DBDownloadBLC } from '../../../../../src/types/database/download';
import GlobalContext from '../../../store/context';
import { commandBackend } from '../../../utils/socket';
import { displayMessage } from '../../../utils/tools';
import criteras_types from './_blc_criterias_types';

const { Option } = Select;

interface KaraBlacklistState {
	criterias: DBDownloadBLC[],
	filter_type: number,
	filter_mode: string,
	filter_options: any[],
	filter_options_full: any[],
	filter_value: any
}

class KaraBlacklist extends Component<unknown, KaraBlacklistState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {
			criterias: [],
			filter_type: 1004,
			filter_mode: 'text',
			filter_options: [],
			filter_options_full: [],
			filter_value: null,
		};
	}

	async componentDidMount() {
		try {
			const res = await commandBackend('getRemoteTags', undefined, false, 300000);
			this.setState({ filter_options_full: res.content }, this.refresh);
		} catch (e) {
			// already display
		}
	}

	refresh = async () => {
		const data:DBDownloadBLC[] = await commandBackend('getDownloadBLCs', undefined, false, 300000);
		this.setState({ criterias: data });
	}

	handleCriteriasTypeChange = (value, option) => {
		const mode = option.props['data-mode'];
		if (mode === 'tag') {
			this.setState({
				filter_type: value,
				filter_mode: mode,
				filter_options: this.state.filter_options_full.map((o) => {
					if (o.type === value || (o.types && o.types.indexOf(value) >= 0))
						return o;
					return undefined;
				}).filter((o) => {
					return o;
				}),
				filter_value: null,
			});
		} else if (mode === 'number') {
			this.setState({
				filter_type: value,
				filter_mode: mode,
				filter_value: 0,
			});
		} else {
			this.setState({
				filter_type: value,
				filter_mode: mode,
				filter_value: '',
			});
		}
	}

	handleCriteriaValue = (value) => {
		if (value.target)
			value = value.target.value;
		this.setState({
			filter_value: value,
		});
	}

	handleCriteriaSubmit = async () => {
		if (this.state.filter_value === null || this.state.filter_value === '') {
			displayMessage('error', i18next.t('BLACKLIST.INVALID_CRITERIA'));
			return;
		}
		if (this.state.filter_type === 1002 && this.state.filter_value === 0) {
			displayMessage('error', i18next.t('BLACKLIST.SHORTER_THAN_ONE_SECOND'));
			return;
		}

		await commandBackend('addDownloadBLC', {
			type: this.state.filter_type,
			value: this.state.filter_value,
		});
		this.setState({
			filter_type: 1004,
			filter_mode: 'text',
			filter_options: [],
			filter_value: null,
		});
		this.refresh();
	}

	handleCriteriaDelete = async (id) => {
		await commandBackend('deleteDownloadBLC', {id});
		this.refresh();
	}

	filter_input() {
		if (this.state.filter_mode === 'text') {
			return <Input style={{ width: 200 }} value={this.state.filter_value} onChange={this.handleCriteriaValue} />;
		} else if (this.state.filter_mode === 'number') {
			return <InputNumber value={this.state.filter_value} onChange={this.handleCriteriaValue} />;
		} else if (this.state.filter_mode === 'tag' && this.state.filter_options.length) {
			return <Select
				style={{ width: 200 }}
				onChange={this.handleCriteriaValue}
			>
				<option key="null" value=""></option>
				{this.state.filter_options.map(o => <option key={o.tid} value={o.tid}>{o.name}</option>)}
			</Select>;
		}
	}

	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.DOWNLOAD_BLACKLIST.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.DOWNLOAD_BLACKLIST.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<div style={{marginBottom: '1em'}}>
						<Select style={{ width: 200 }} value={this.state.filter_type} onChange={this.handleCriteriasTypeChange}>
							{criteras_types.map(o => <Option key={o.value} data-mode={o.mode} value={o.value}>
								{i18next.t(`BLACKLIST.BLCTYPE_${o.value}`)}
							</Option>)}
						</Select>
						{' '}
						{this.filter_input()}
						{' '}
						<Button type="primary" onClick={this.handleCriteriaSubmit}>+</Button>
					</div>
					<Table
						dataSource={this.state.criterias}
						columns={this.criterias_columns}
						rowKey='dlblc_id'
					/>

				</Layout.Content>
			</>
		);
	}

	criterias_columns = [
		{
			title: i18next.t('BLACKLIST.TYPE'),
			dataIndex: 'type',
			key: 'type',
			render: type => {
				const t = criteras_types.filter((t) => {
					return t.value === type;
				});
				return t.length > 0 ? i18next.t(`BLACKLIST.BLCTYPE_${t[0].value}`) : type;
			}
		}, {
			title: i18next.t('BLACKLIST.VALUE'),
			dataIndex: 'value',
			key: 'value',
			render: (value, record) => {
				let label = value;
				const t = criteras_types.filter((t) => {
					return t.mode === 'tag' && t.value === record.type;
				});
				if (t.length > 0) { // c'est un tag ^^
					const o = this.state.filter_options_full.filter((o) => {
						return o.tid === value;
					});
					if (o.length > 0)
						label = o[0].name;
				}
				return <span>{label} <Button type="primary" onClick={() => this.handleCriteriaDelete(record.dlblc_id)}>-</Button></span>;
			}
		},
	];
}

export default KaraBlacklist;
