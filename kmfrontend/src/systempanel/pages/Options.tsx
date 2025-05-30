import { Component } from 'react';

import Config from './Config';

const propertiesToDisplay = [
	'App.QuickStart',
	'Online.RemoteUsers.Enabled',
	'Online.RemoteUsers.DefaultHost',
	'Online.Discord.DisplayActivity',
	'Online.FetchPopularSongs',
	'Online.ErrorTracking',
	'Player.HardwareDecoding',
	'Player.KeyboardMediaShortcuts',
	'Online.Updates.Medias.Jingles',
	'Online.Updates.Medias.Sponsors',
	'Online.Updates.Medias.Intros',
	'Online.Updates.Medias.Outros',
	'Online.Updates.Medias.Encores',
];

class Options extends Component<unknown, unknown> {
	render() {
		return <Config properties={propertiesToDisplay} />;
	}
}

export default Options;
