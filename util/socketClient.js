/**
 * How to use
 *
 * ts-node socketClient.js
 * in a TTY-compatible terminal (cmd on Windows, not git bash)
 * use sendCommand('login', {body: {...}})  with the right params
 *
 */

import repl from 'repl';
import { io } from 'socket.io-client';

const socket = io(process.argv[2] || 'http://localhost:1337');

function sendCommand(name, data) {
	socket.emit(name, data, ack => {
		console.log(JSON.stringify(ack, null, 2));
	});
}

const REPLServer = repl.start();
REPLServer.context.sendCommand = sendCommand;
REPLServer.displayPrompt();
