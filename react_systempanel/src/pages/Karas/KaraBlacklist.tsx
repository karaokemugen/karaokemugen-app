import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Layout, Table, Input, InputNumber, Button, Select} from 'antd';
import {loading, errorMessage, warnMessage, infoMessage} from '../../actions/navigation';
import {ReduxMappedProps} from '../../react-app-env';

const { Option } = Select;

const encodeForm = (data) => {
  return Object.keys(data)
      .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(data[key]))
      .join('&');
}

interface KaraBlacklistProps extends ReduxMappedProps {}

interface KaraBlacklistState {
	criterias: any[],
	filter_type: number,
	filter_mode: string,
	filter_options: any[],
	filter_options_full: any[],
	filter_value: any,
	utime: any,
}

class KaraBlacklist extends Component<KaraBlacklistProps, KaraBlacklistState> {

	constructor(props) {
		super(props);
		this.state = {
			criterias: [],
			filter_type:1004,
			filter_mode:'text',
			filter_options:[],
			filter_options_full:[],
			filter_value:null,
			utime:null,
		};
	}

	componentDidMount() {
		console.log('componentDidMount');
		this.props.loading(true);
		axios.get('/api/system/tags?instance=kara.moe')
			.then(res => {
				this.props.loading(false);
				this.setState({
					filter_options_full:res.data.content,
				});
				this.refresh();
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	refresh() {
		console.log('refresh');
		axios.get('/api/system/downloads/blacklist/criterias')
			.then(res => {
				this.setState({criterias: res.data});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
		this.setState({utime:Date.now()});
	}

	handleCriteriasTypeChange(value,option) {
		console.log('handleCriteriasTypeChange');
		var mode = option.props['data-mode'];
		if(mode==='tag')
		{
			this.setState({
				filter_type:value,
				filter_mode:mode,
				filter_options: this.state.filter_options_full.map((o)=>{
					if(o.type===value)
						return o;
					return undefined;
				}).filter((o)=>{ return o; }),
				filter_value:null,
			});

		}
		else if(mode==='number')
		{
			this.setState({
				filter_type:value,
				filter_mode:mode,
				filter_value:0,
			});
		}
		else
		{
			this.setState({
				filter_type:value,
				filter_mode:mode,
				filter_value:'',
			});
		}
	}

	handleCriteriaValue(value) {
		console.log('handleCriteriaValue');
		if(value.target)
			value = value.target.value;
		this.setState({
			filter_value:value,
		});
	}

	handleCriteriaSubmit() {
		console.log('handleCriteriaSubmit');
		if(this.state.filter_value===null || this.state.filter_value==='')
		{
			this.props.errorMessage(`Critère invalide`);
			return;
		}
		if(this.state.filter_type===1002 && this.state.filter_value===0)
		{
			this.props.errorMessage(`Durée minimum de 1s`);
			return;
		}

		this.props.loading(true);
		axios.post('/api/system/downloads/blacklist/criterias',encodeForm({
			type:this.state.filter_type,
			value:this.state.filter_value,
		}))
			.then(res => {
				this.props.loading(false);
				this.setState({
					filter_type:1004,
					filter_mode:'text',
					filter_options:[],
					filter_value:null,
				});
				this.refresh();
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	handleCriteriaDelete(id){
		console.log('handleCriteriaDelete');
		this.props.loading(true);
		axios.delete('/api/system/downloads/blacklist/criterias/'+id)
			.then(res => {
				this.props.loading(false);
				this.refresh();
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}

	filter_input() {
		console.log('filter_input');

		if(this.state.filter_mode==='text')
		{
			return <Input  style={{ width:200 }} value={this.state.filter_value} onChange={this.handleCriteriaValue.bind(this)} />
		}
		else if(this.state.filter_mode==='number')
		{
			return <InputNumber value={this.state.filter_value} onChange={this.handleCriteriaValue.bind(this)} />
		}
		else if(this.state.filter_mode==='tag' && this.state.filter_options.length)
		{
			return <select
				style={{ width: 200 }}
				onChange={this.handleCriteriaValue.bind(this)}
				>
				<option key="null" value=""></option>
				{this.state.filter_options.map(o => <option key={o.tag_id} value={o.tag_id}>{o.name}</option>)}
			</select>
		}
		else
		{
			return null
		}
	}

	render() {
		console.log('render');
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Layout>
					<Layout.Header>
						<Select style={{ width: 200 }} value={this.state.filter_type} onChange={this.handleCriteriasTypeChange.bind(this)}>
							{this.criteras_types.map(o => <Option key={o.value} data-mode={o.mode} value={o.value}>{o.label}</Option>)}
						</Select>
						{" "}
						{this.filter_input()}
						{" "}
						<Button type="primary" onClick={this.handleCriteriaSubmit.bind(this)}>+</Button>
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
			title: 'Type',
			dataIndex: 'type',
			key: 'type',
			render: type => {
				var t = this.criteras_types.filter((t)=>{ return t.value===type})
				return t.length>0 ? t[0].label : type;
			}
		}, {
			title: 'Value',
			dataIndex: 'value',
			key: 'value',
			render: (value, record)  => {
				var label = value
				var t = this.criteras_types.filter((t)=>{ return t.mode==="tag" && t.value===record.type})
				if(t.length>0) // c'est un tag ^^
				{
					var o = this.state.filter_options_full.filter((o) => { return o.tag_id===value})
					if(o.length>0)
						label = o[0].name;
				}
				return <span>{label} <Button type="primary" onClick={this.handleCriteriaDelete.bind(this,record.dlblc_id)}>-</Button></span>
			}
		},
	];

	criteras_types = [
		{
			label:"Plus long que (s)",
			value:1002,
			mode:'number',
		},
		{
			label:"Plus court que (s)",
			value:1003,
			mode:'number',
		},
		{
			label:"Titre contenant",
			value:1004,
			mode:'text',
		},
		{
			label:"Série contenant",
			value:1000,
			mode:'text',
		},
		{
			label:"Métadonnées",
			value:0,
			mode:'text',
		},
		{
			label:"Chanteur",
			value:2,
			mode:'tag',
		},
		{
			label:"Type",
			value:3,
			mode:'tag',
		},
		{
			label:"Créateur",
			value:4,
			mode:'tag',
		},
		{
			label:"Langue",
			value:5,
			mode:'tag',
		},
		{
			label:"Auteur du kara",
			value:6,
			mode:'tag',
		},
		{
			label:"Tags",
			value:7,
			mode:'tag',
		},
		{
			label:"Compositeur",
			value:8,
			mode:'tag',
		},
		{
			label:"Groupe de kara",
			value:9,
			mode:'tag',
		}
	];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	infoMessage: (message) => dispatch(infoMessage(message)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(KaraBlacklist);
