/** Bus d'événements centralisé, permettant d'utiliser le pattern pub/sub pour la propagation d'événements. */

import {EventEmitter} from 'events';
import logger from 'logger';

const eventEmitter = new EventEmitter();

// Types d'événements.
export const configUpdate = 'CONFIG_UPDATE';


export function emit(typeEvent, ...data) {
	logger.debug('Emission de l\'événement ' + typeEvent);
	eventEmitter.emit(typeEvent, data);
}

export function on(typeEvent, listenerFunc) {
	logger.debug('Souscription à l\'événement ' + typeEvent);
	return eventEmitter.on(typeEvent, listenerFunc);
}
