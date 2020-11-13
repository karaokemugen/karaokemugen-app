import {Layout} from 'antd';
import i18next from 'i18next';
import React, {Component} from 'react';
import {Link} from 'react-router-dom';

class Home extends Component<unknown, unknown> {
	render() {
		return (
			<>
				<Layout.Header>
					<div className='title'>{i18next.t('HEADERS.HOME.TITLE')}</div>
					<div className='description'>{i18next.t('HEADERS.HOME.DESCRIPTION')}</div>
				</Layout.Header>
				<Layout.Content>
					<h1>{i18next.t('HOME.WELCOME')}</h1>
					<p>{i18next.t('HOME.DIFFERENTS_MENUS')}</p>
					<ul>
						<li>
							<b>{i18next.t('MENU.SYSTEM')} : </b> {i18next.t('HOME.SYSTEM_DESCRIPTION')}
						</li>
						<li>
							<b>{i18next.t('MENU.KARAS')} : </b> {i18next.t('HOME.KARAS_DESCRIPTION_1')}
							<Link to="/system/km/karas/download">{i18next.t('HOME.KARAS_DESCRIPTION_2')}</Link>
							{i18next.t('HOME.KARAS_DESCRIPTION_3')}
						</li>
						<li>
							<b>{i18next.t('MENU.TAGS')} : </b> {i18next.t('HOME.TAGS_DESCRIPTION')}
						</li>
						<li>
							<b>{i18next.t('MENU.USERS')} : </b> {i18next.t('HOME.USERS_DESCRIPTION_1')}
							<Link to="/system/km/users">{i18next.t('HOME.USERS_DESCRIPTION_2')}</Link>
							{i18next.t('HOME.USERS_DESCRIPTION_3')}
						</li>
					</ul>
				</Layout.Content>
			</>
		);
	}
}

export default Home;
