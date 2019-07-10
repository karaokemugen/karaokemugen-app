import React, {Component} from 'react';
import {Button, Layout, Timeline} from 'antd';
import {connect} from 'react-redux';
import Axios from 'axios';
import {loading, infoMessage, errorMessage, warnMessage} from '../actions/navigation';
import {ReduxMappedProps} from '../react-app-env';

interface LogProps extends ReduxMappedProps {}

interface LogState {
	log: string[],
	error: string,
}

class Log extends Component<LogProps, LogState> {
	constructor(props) {
		super(props);
		this.state = {
			log: [],
			error: ''
		};
	}

	refresh() {
		this.props.loading(true);
		Axios.get('/api/system/log')
			.then(res => {
				this.props.loading(false);
				this.parseLogs(res.data);
			})
			.catch(err => this.props.errorMessage('Unable to fetch logs ' + err));
	}

	parseLogs(data: string) {
		const logs = [];
		const re = new RegExp('^([0-1][0-9]|[2][0-3]):([0-5][0-9])$');
		const lines = data.split('\n')
		lines.forEach((line, i) => {
			if (re.test(line.substr(0,5))) {
				let a = i + 1;
				let string = line;
				while (!re.test(lines[a].substr(0,5) || '00:00')) {
					string = string+'\n\n'+lines[a];
					a++;
				}
				logs.push(string);
			}
		})
		this.setState({log: logs});
	}

	componentDidMount() {
		this.refresh();
	}

	render() {
		return (

			<Layout.Content style={{ padding: '25px 50px', textAlign: 'left' }}>

			<Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button>
			<Timeline>
				{
					this.state.log.map(line => {
						let color = 'green';
						if (line.includes( ' - warn: ')) { color = 'yellow'; }
						if (line.includes(' - error: ')) { color = 'red'; }
						if (line.includes(' - debug: ')) { color = 'blue'; }
						return (
							<Timeline.Item style={{color: color }}>
								{line}
							</Timeline.Item>
						);
					})
				}
			</Timeline>
		</Layout.Content>
		);

	}
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

export default connect(mapStateToProps, mapDispatchToProps)(Log);
