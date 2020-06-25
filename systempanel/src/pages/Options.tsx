import React, { Component } from 'react';
import Config from './Config';

let propertiesToDisplay = [
	'App.QuickStart',
	'Online.Users',
	'Online.Discord.DisplayActivity',
	'Online.Stats',
	'Online.ErrorTracking',
	'Player.HardwareDecoding',
	'Player.ProgressBarDock',
	'Online.Updates.Medias.Jingles',
	'Online.Updates.Medias.Sponsors',
	'Online.Updates.Medias.Intros',
	'Online.Updates.Medias.Outros',
	'Online.Updates.Medias.Encores'
];

class Options extends Component<{}, {}> {

	render() {
		return (
			<Config properties={propertiesToDisplay} />
		);
	}
}

export default Options;
