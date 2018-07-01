import React, {Component} from 'react';
import axios from 'axios';
import {connect} from 'react-redux';
import {Tooltip, Tag, Icon, Button, Layout, Table} from 'antd';
import {Link} from 'react-router-dom';
import {loading, errorMessage, warnMessage} from '../../actions/navigation';

class SeriesList extends Component {

	constructor(props) {
		super(props);
		this.state = {
			series: [],			
			serie: {}
		};
	}

	componentDidMount() {
		this.refresh();
	}

	refresh() {
		this.props.loading(true);
		axios.get('/api/series')
			.then(res => {
				this.props.loading(false);
				this.setState({series: res.data});
			})
			.catch(err => {
				this.props.loading(false);
				this.props.errorMessage(`${err.response.status}: ${err.response.statusText}. ${err.response.data}`);
			});
	}
	
	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<Table
					dataSource={this.state.series}
					columns={this.columns}
					rowKey='serie_id'
				/>
				<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>				
			</Layout.Content>
		);
	}

	columns = [{
		title: 'Original Name',
		dataIndex: 'name',
		key: 'name',
		render: name => name
	}, {
		title: 'Aliases',
		dataIndex: 'aliases',
		key: 'aliases',	
		render: aliases => {
			let tags = [];
			if (aliases) {				
				aliases.split(',').forEach((alias) => {
					const isLongTag = alias.length > 20;
					const tagElem = (
						<Tag>
							{isLongTag ? `${alias.slice(0, 20)}...` : alias}
						</Tag>
					);				
					tags.push(isLongTag ? (<Tooltip title={alias} key={alias}>{tagElem}</Tooltip>) : tagElem);
					return true;
				});
			}
			return tags;
		}
	}, {
		title: 'Action',
		key: 'action',
		render: (text, record) => (<span>
			<Link to={`/series/${record.serie_id}`}><Icon type='edit'/></Link>			
		</span>)
	}];
}

const mapStateToProps = (state) => ({
	loadingActive: state.navigation.loading
});

const mapDispatchToProps = (dispatch) => ({
	loading: (active) => dispatch(loading(active)),
	errorMessage: (message) => dispatch(errorMessage(message)),
	warnMessage: (message) => dispatch(warnMessage(message))
});

export default connect(mapStateToProps, mapDispatchToProps)(SeriesList);
