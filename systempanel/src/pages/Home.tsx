import React, {Component} from 'react';
import {Layout} from 'antd';
import {connect} from 'react-redux';

interface HomeProps {}

interface HomeState {}

class Home extends Component<HomeProps, HomeState> {
	render() {
		return (
			<Layout.Content style={{ padding: '25px 50px', textAlign: 'left' }}>
				<h1>Welcome to Karaoke Mugen's system panel</h1>
				<p>Here are the different menus you can use :</p>
				<ul>
					<li>
						<b>System : </b> See logs, change configuration options, and manage karaoke session datata
					</li>
					<li>
						<b>Karas : </b> View, edit, download, and create karaoke data files. You can also edit the download blacklist and view most requested, most played, and karaoke history
					</li>
					<li>
						<b>Series : </b> Manage series from here
					</li>
					<li>
						<b>Tags : </b> Manage tags (singers, songwriters, creators, song types, etc.)
					</li>
					<li>
						<b>Database : </b> Backup/restore your database, trigger a manual generation or update your media files (if you are using a karaokebase under git)
					</li>
					<li>
						<b>Users : </b> Create/edit/view users, change passwords, make new guests,
					</li>
				</ul>
			</Layout.Content>
		);
	}
}

export default connect()(Home);