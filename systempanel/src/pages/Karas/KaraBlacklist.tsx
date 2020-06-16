import React, {Component} from 'react';
import {Layout, Table, Input, InputNumber, Button, Select} from 'antd';
import criteras_types from './_blc_criterias_types';
import i18next from 'i18next';
import Axios from 'axios';
import GlobalContext from '../../store/context';
import { errorMessage } from '../../store/actions/navigation';

const { Option } = Select;

const encodeForm = (data) => {
  return Object.keys(data)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
      .join('&');
}

interface KaraBlacklistState {
	criterias: any[],
	filter_type: number,
	filter_mode: string,
	filter_options: any[],
	filter_options_full: any[],
	filter_value: any
}

class KaraBlacklist extends Component<{}, KaraBlacklistState> {
	static contextType = GlobalContext
	context: React.ContextType<typeof GlobalContext>

	constructor(props) {
		super(props);
		this.state = {
			criterias: [],
			filter_type:1004,
			filter_mode:'text',
			filter_options:[],
			filter_options_full:[],
			filter_value:null,
		};
	}

	async componentDidMount() {
		let res = await Axios.get('/tags/remote')
		await this.setState({filter_options_full:res.data.content});
		await this.refresh();
	}

	refresh = async () => {
		let res = await Axios.get('/downloads/blacklist/criterias')
		this.setState({criterias: res.data});
	}

	handleCriteriasTypeChange = (value,option) => {
		let mode = option.props['data-mode'];
		if(mode==='tag') {
			this.setState({
				filter_type:value,
				filter_mode:mode,
				filter_options: this.state.filter_options_full.map((o)=>{
					if(o.type===value || (o.types && o.types.indexOf(value)>=0))
						return o;
					return undefined;
				}).filter((o)=>{ return o; }),
				filter_value:null,
			});
		} else if(mode==='number') {
			this.setState({
				filter_type:value,
				filter_mode:mode,
				filter_value:0,
			});
		}
		else {
			this.setState({
				filter_type:value,
				filter_mode:mode,
				filter_value:'',
			});
		}
	}

	handleCriteriaValue = (value) => {
		if(value.target)
			value = value.target.value;
		this.setState({
			filter_value:value,
		});
	}

	handleCriteriaSubmit = async () => {
		if(this.state.filter_value===null || this.state.filter_value==='') {
			this.context.globalDispatch(errorMessage(i18next.t('BLACKLIST.INVALID_CRITERIA')));
			return;
		}
		if(this.state.filter_type===1002 && this.state.filter_value===0) {
			this.context.globalDispatch(errorMessage(i18next.t('BLACKLIST.SHORTER_THAN_ONE_SECOND')));
			return;
		}

		await Axios.post('/downloads/blacklist/criterias',encodeForm({
			type:this.state.filter_type,
			value:this.state.filter_value,
		}));
		this.setState({
			filter_type:1004,
			filter_mode:'text',
			filter_options:[],
			filter_value:null,
		});
		this.refresh();
	}

	handleCriteriaDelete = async (id) => {
		await Axios.delete(`/downloads/blacklist/criterias/${id}`)
		this.refresh();
	}

	filter_input() {
		if(this.state.filter_mode==='text')
		{
			return <Input  style={{ width:200 }} value={this.state.filter_value} onChange={this.handleCriteriaValue} />
		}
		else if(this.state.filter_mode==='number')
		{
			return <InputNumber value={this.state.filter_value} onChange={this.handleCriteriaValue} />
		}
		else if(this.state.filter_mode==='tag' && this.state.filter_options.length)
		{
			return <select
				style={{ width: 200 }}
				onChange={this.handleCriteriaValue}
				>
				<option key="null" value=""></option>
				{this.state.filter_options.map(o => <option key={o.tid} value={o.tid}>{o.name}</option>)}
			</select>
		}
	}

	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Select style={{ width: 200 }} value={this.state.filter_type} onChange={this.handleCriteriasTypeChange}>
							{criteras_types.map(o => <Option key={o.value} data-mode={o.mode} value={o.value}>
								{i18next.t(`BLACKLIST.BLCTYPE_${o.value}`)}
								</Option>)}
						</Select>
						{" "}
						{this.filter_input()}
						{" "}
						<Button type="primary" onClick={this.handleCriteriaSubmit}>+</Button>
					</Layout.Header>
					<Layout.Content>

						<Table
							dataSource={this.state.criterias}
							columns={this.criterias_columns}
							rowKey='dlblc_id'
						/>

					</Layout.Content>
				</Layout>
			</Layout.Content>
		);
	}

	criterias_columns = [
		{
			title: i18next.t('BLACKLIST.TYPE'),
			dataIndex: 'type',
			key: 'type',
			render: type => {
				let t = criteras_types.filter((t)=>{ return t.value===type})
				return t.length>0 ? i18next.t(`BLACKLIST.BLCTYPE_${t[0].value}`) : type;
			}
		}, {
			title: i18next.t('BLACKLIST.VALUE'),
			dataIndex: 'value',
			key: 'value',
			render: (value, record)  => {
				let label = value
				let t = criteras_types.filter((t)=>{ return t.mode==="tag" && t.value===record.type})
				if(t.length>0) // c'est un tag ^^
				{
					let o = this.state.filter_options_full.filter((o) => { return o.tid===value})
					if(o.length>0)
						label = o[0].name;
				}
				return <span>{label} <Button type="primary" onClick={() => this.handleCriteriaDelete(record.dlblc_id)}>-</Button></span>
			}
		},
	];
}

export default KaraBlacklist;
