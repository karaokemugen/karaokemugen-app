import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Tabs, List } from 'antd';
import {
	filterLocalKaras,
	filterOnlineKaras,
	toggleWatchDownloadQueue,
	downloadSong
} from '../../actions/karas';

const TabPane = Tabs.TabPane;
const ListItem = List.Item;

class ManageKaras extends Component {
	constructor(props) {
		super(props);
		this.state = {
			filter: {
				searchString: ''
			}
		};
	}

	componentDidMount() {
		this.props.filterLocalKaras(this.state.filter);
		this.props.filterOnlineKaras();
		this.props.toggleWatchDownloadQueue();
	}

	componentDidUpdate() {
		// Set a timer to check updates again?
	}

	searchChange = e => {
		const newState = {
			...this.state,
			filter: {
				searchString: e.target.value
			}
		};
		this.setState(newState, () => {
			this.props.filterOnlineKaras(this.state.filter);
		});
	};

	downloadSong = kid => {
		this.props.downloadSong(kid);
	};

	render() {
		const { localKaras, onlineKaras, downloadQueue } = this.props;
		const renderLocalKaras = ({ kid, title }) => (
			<ListItem key={kid} actions={[<button type="button">Delete</button>]}>
				<ListItem.Meta title={title} />
			</ListItem>
		);
		const renderOnlineKaras = ({ kid, title }) => (
			<ListItem
				key={kid}
				actions={[
					<button type="button" onClick={() => this.downloadSong(kid)}>
						Download
					</button>
				]}
			>
				<ListItem.Meta title={title} />
			</ListItem>
		);
		const renderDownloadQueue = item => {
			const kara= onlineKaras.find(k => k.name === item.name) || {};
			console.log(item);
			console.log(kara);
			return (
				<ListItem key={''}>
					<ListItem.Meta title={''} />
				</ListItem>
			);
		};

		return (
			<div style={{ height: '100%', overflow: 'auto' }}>
				<Tabs defaultActiveKey="1" style={{ padding: 24 }}>
					<TabPane tab="Local karas" key="1">
						<List dataSource={localKaras} renderItem={renderLocalKaras} />
					</TabPane>
					<TabPane tab="Get more karas" key="2">
						<input
							type="text"
							onChange={this.searchChange}
							value={this.state.filter.searchString}
						/>
						<List
							dataSource={onlineKaras}
							renderItem={renderOnlineKaras}
							loading={this.props.isSearching}
						/>
					</TabPane>
					<TabPane tab="Download Queue" key="3">
						<List
							dataSource={downloadQueue}
							renderItem={renderDownloadQueue}
							loading={this.props.isSearching}
						/>
					</TabPane>
				</Tabs>
			</div>
		);
	}
}

const mapStateToProps = state => {
	const { karas } = state;
	return {
		localKaras: karas.localKaras,
		onlineKaras: karas.onlineKaras,
		downloadQueue: karas.downloadQueue,
		isSearching: karas.isSearching
	};
};

const mapDispatchToProps = {
	filterLocalKaras,
	filterOnlineKaras,
	toggleWatchDownloadQueue,
	downloadSong
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ManageKaras);
