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
		const re = /[0-9]{2} [0-9]{4} [0-9]{2}:[0-9]{2}:[0-9]{2} GMT\+[0-9]{4} \(GMT\+[0-9]{2}:[0-9]{2}\) - [a-z]+:/
		const lines = data.split("\n")
		lines.forEach((line, i) => {
			if (re.test(line)) {
				let a = 1;
				let string = line;
				while (!re.test(lines[i + a])) {
					string = string+"\n"+lines[i + a];
					a++;
					if(a>100)
					{
						string = string+"\n...";
						break;
					}
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

			<p><Button type='primary' onClick={this.refresh.bind(this)}>Refresh</Button></p>
			<Timeline>
				{
					this.state.log.map((line,i) => {
						let color = '#a6e22d'; // green
						if (line.includes( ' - warn: ')) { color = '#e6db74'; } // yellow
						if (line.includes(' - error: ')) { color = '#f9265d'; } // red
						if (line.includes(' - debug: ')) { color = '#999999'; } // blue
						return (
							<Timeline.Item key={i} style={{color: color }}>
								<code style={{whiteSpace:'pre-wrap'}}>{line}</code>
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
