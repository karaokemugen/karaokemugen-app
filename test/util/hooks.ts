import {disconnectSocket} from './util';

exports.mochaHooks = {
	afterAll(done: any) {
	  disconnectSocket();
	  done();
	}
};