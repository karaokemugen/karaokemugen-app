import React, { Component } from 'react';
import { connect } from 'react-redux';
import { Tabs, List, Button, Badge } from 'antd';
import { filterLocalKaras, deleteKara as dk } from '../../actions/karas';
import DownloadKaras from './ManageKaras/DownloadKaras';
import DownloadQueueKaras from './ManageKaras/DownloadQueueKaras';

const TabPane = Tabs.TabPane;
const ListItem = List.Item;

class ManageKaras extends Component {
	componentDidMount() {}

	componentDidUpdate() {
		// Set a timer to check updates again?
	}

	deleteSong = kid => {
		const { deleteKara } = this.props;
		deleteKara(kid);
	};

	render() {
		const { localKaras, downloadQueueCount } = this.props;
		const renderLocalKaras = ({ kid, title }) => (
			<ListItem
				key={kid}
				actions={[
					<Button type="danger" onClick={() => this.deleteSong(kid)}>
						Delete
					</Button>
				]}
			>
				<ListItem.Meta title={title} />
			</ListItem>
		);

		return (
			<div style={{ height: '100%', overflow: 'auto' }}>
				<Tabs defaultActiveKey="1" style={{ padding: 24 }}>
					<TabPane tab="Local karas" key="1">
						<List dataSource={localKaras} renderItem={renderLocalKaras} />
					</TabPane>
					<TabPane tab="Get more karas" key="2">
						<DownloadKaras />
					</TabPane>
					<TabPane
						tab={
							<span>
								Download Queue{' '}
								<Badge
									count={downloadQueueCount}
									style={{ backgroundColor: '#40a9ff' }}
								/>
							</span>
						}
						key="3"
					>
						<DownloadQueueKaras />
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
		isSearching: karas.isSearching,
		downloadQueueCount: karas.downloadQueue.length
	};
};

const mapDispatchToProps = {
	filterLocalKaras,
	deleteKara: dk
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ManageKaras);
