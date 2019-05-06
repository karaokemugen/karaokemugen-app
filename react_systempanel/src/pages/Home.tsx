import React, {Component} from 'react';
import {Layout} from 'antd';
import {connect} from 'react-redux';

interface HomeProps {}

interface HomeState {}

class Home extends Component<HomeProps, HomeState> {
	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'center' }}>
				<h1>Welcome to Karaoke Mugen's control panel</h1>
				<p>You can manage users, create .kara files, update your base or regenerate the database from here.</p>
			</Layout.Content>
		);
	}
}

export default connect()(Home);