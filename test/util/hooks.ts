import { disconnectSocket } from './util.js';

export const mochaHooks = {
	afterAll(done: any) {
		disconnectSocket();
		done();
	},
};
