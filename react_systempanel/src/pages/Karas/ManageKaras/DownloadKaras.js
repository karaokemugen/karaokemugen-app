import React, { Component } from 'react';
import { List, Button } from 'antd';
import { connect } from 'react-redux';
import { filterOnlineKaras as fok, downloadSong as dls } from '../../../actions/karas';

const ListItem = List.Item;

class DownloadKaras extends Component {
	state = {
		filter: {
			searchString: ''
		}
	};

	componentDidMount() {
		const { filterOnlineKaras } = this.props;
		filterOnlineKaras();
	}

	searchChange_delay = null;
	searchChange = e => {
		const newState = {
			...this.state,
			filter: {
				searchString: e.target.value
			}
		};
		const { filter } = newState;
		const { filterOnlineKaras } = this.props;
		this.setState(newState, () => {
			clearTimeout(this.searchChange_delay);
			this.searchChange_delay = setTimeout((e) => {
				filterOnlineKaras(filter);
			},500, filter)
		});
		
	};

	downloadSong = kid => {
		this.props.downloadSong(kid);
	};

	renderOnlineKaras = ({ kid, title }) => (
		<ListItem
			key={kid}
			actions={[
				<Button onClick={() => this.downloadSong(kid)}>Download</Button>
			]}
		>
			<ListItem.Meta title={title} />
		</ListItem>
	);
	render() {
		const { onlineKaras, isSearching } = this.props;
		const {
			filter: { searchString }
		} = this.state;
		return (
			<div>
				<input type="text" onChange={this.searchChange} value={searchString} />
				<List
					dataSource={onlineKaras}
					renderItem={this.renderOnlineKaras}
					loading={isSearching}
					pagination={{position:'both',pageSize:50}}
				/>
			</div>
		);
	}
}

const mapStateToProps = state => {
	const { karas } = state;
	const { onlineKaras, isSearching } = karas;
	return {
		onlineKaras,
		isSearching
	};
};

const mapDispatchToProps = {
	filterOnlineKaras: fok,
	downloadSong: dls
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(DownloadKaras);
