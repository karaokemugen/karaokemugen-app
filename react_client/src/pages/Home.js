import React, {Component} from 'react';
import {Layout} from 'antd';
import {connect} from 'react-redux';

class Home extends Component {
	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<h1>Accueil</h1>
			</Layout.Content>
		);
	}
}

export default connect()(Home);