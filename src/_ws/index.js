var http = require('http');
const logger = require('../_common/utils/logger.js');
module.exports = {
	SYSPATH:null,
	SETTINGS:null,
	LISTEN:null,
	socket:null,
	init:function() {		
			// Chargement du serveur web
			var server = http.createServer(function(req, res) {
					res.writeHead(200, {"Content-Type": "text/html"});
					res.end('Hello world');    
			});
			server.listen(module.exports.LISTEN);

			// Chargement de socket.io
			var io = require('socket.io').listen(server);
			module.exports.socket = io.sockets;
			logger.info('[WS] Websocket channel is READY and listens on port '+module.exports.LISTEN);			
	}
}