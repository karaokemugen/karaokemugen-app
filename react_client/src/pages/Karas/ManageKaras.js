import React, { Component } from 'react';
import { connect } from 'react-redux';
import { filterLocalKaras, filterOnlineKaras } from '../../actions/karas';

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
	}

	componentDidUpdate() {
		// Set a timer to check updates again?
	}

	searchChange = (e) => {
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

	render() {
		const {localKaras, onlineKaras} = this.props;
		const downloadedKaras = localKaras.map(kara => {
			const { kid, title } = kara;
			return <li key={kid}>{title}</li>;
		});

		const downloadableKaras = onlineKaras.map(kara => {
			const { kid, title } = kara;
			return <li key={kid}>{title}</li>;
		});

		return (
			<div>
				<div>
					<h2>Downloaded Karas</h2>
					<ul>{downloadedKaras}</ul>
				</div>
				<div>
					<h2>Downloadable Karas</h2>
					<input type="text" onChange={this.searchChange} value={this.state.filter.searchString}/>
					<ul>{downloadableKaras}</ul>
				</div>
			</div>
		);
	}
}

const mapStateToProps = state => {
	const { karas } = state;
	return {
		localKaras: karas.localKaras,
		onlineKaras: karas.onlineKaras
	};
};

const mapDispatchToProps = {
	filterLocalKaras,
	filterOnlineKaras
};

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(ManageKaras);
