import {createServer} from 'http';
const logger = require('winston');

let io;

export async function emitWS(type,data) {
	logger.debug('[WS] Sending message '+type+' : '+JSON.stringify(data));
	io.sockets.emit(type,data);
}

export async function initWSServer(listenPort) {
	// Initializing webserver
	const server = createServer(function(req, res) {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end('Hello world');    
	});
	server.listen(listenPort);

	// Initializing socket.io
	io = require('socket.io').listen(server);	
	logger.info(`[WS] Websocket channel is READY and listens on port ${listenPort}`);
}
	
	