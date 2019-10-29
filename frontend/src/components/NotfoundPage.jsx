import i18next from 'i18next';
import React, { Component } from 'react';
import image404 from '../assets/nanami_.jpg';

class NotfoundPage extends Component {
	constructor(props) {
		super(props);
	}

	render() {
		return (
			<React.Fragment>
				<p>{location.pathname}</p>
				<h1>{i18next.t('404')}</h1>
				<h3>{i18next.t('404_2')}</h3>
				<strong><pre>    * &lt;----- {i18next.t('404_3')}</pre></strong>
				<img height="500" src={image404} />
			</React.Fragment>
		);
	}
}

export default NotfoundPage;