/** Event bus, using pub/sub methods. */

import {EventEmitter} from 'events';
//import logger from './logger';

const eventEmitter = new EventEmitter();

export function emit(typeEvent: string, ...data: any) {
	//logger.debug( 'Emitting event ' + typeEvent);
	return eventEmitter.emit(typeEvent, data);
}

export function on(typeEvent: string, listenerFunc: any) {
	//logger.debug( 'Subscribing to event ' + typeEvent);
	return eventEmitter.on(typeEvent, listenerFunc);
}
