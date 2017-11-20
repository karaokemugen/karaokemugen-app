import React, {Component} from 'react';

import {Message, Icon} from 'semantic-ui-react';

export default function Loading() {
	return (
		<Message icon>
			<Icon name='circle notched' loading />
			<Message.Content>
				<Message.Header>Chargement en cours...</Message.Header>
				Merci de patienter quelques instants.
			</Message.Content>
		</Message>
	);
}