import React, { Component } from 'react';
import { connect } from 'react-redux';
import { List, Button, Progress } from 'antd';
import { downloadStart as dstart, downloadPause as dpause } from '../../../actions/karas';

const ListItem = List.Item;

class DownloadQueueKaras extends Component {
	constructor(props) {
		super(props);
	}

	componentDidMount() {}

	downloadStart = () => {
		this.props.downloadStart();
	};

	downloadPause = () => {
		this.props.downloadPause();
	};

	renderDownloadQueue(item) {
		const { status } = item;
		const inProgress = item.hasOwnProperty('progress') && status === 'DL_RUNNING';
		let progress = 0;
		if (inProgress) {
			const { current, total } = item.progress;
			if (total > 10000) {
				progress = Math.floor((current / total) * 100);
			} else {
				progress = 100;
			}
		} else if (status === 'DL_DONE') {
			progress = 100;
		}
		return (
			<ListItem key={item.pk_id_download}>
				<ListItem.Meta title={item.title} />
				<ListItem.Meta title={item.status} />
				<Progress percent={progress} />
			</ListItem>
		);
	}

	render() {
		console.log(this.props.downloadSong)
		const { downloadQueue } = this.props;
		return (
			<div>
				<Button onClick={() => this.downloadStart()}>Start</Button>
				<List
					dataSource={downloadQueue}
					renderItem={this.renderDownloadQueue}
					loading={this.props.isSearching}
				/>
			</div>
		);
	}
}

const mapStateToProps = state => {
	const { karas } = state;
	const { downloadQueue } = karas;
	return {
		downloadQueue
	};
};

const mapDispatchToProps = {
	downloadStart: dstart,
	downloadPause: dpause
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DownloadQueueKaras);
