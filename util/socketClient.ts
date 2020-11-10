import repl from 'repl';
import socket from 'socket.io-client';

const io = socket(process.argv[2] || 'http://localhost:1337');

function sendCommand(name: string, data: any) {
	io.emit(name, data, (ack) => {
		console.log(ack);
	});
}

const REPLServer = repl.start();
REPLServer.context.sendCommand = sendCommand;
REPLServer.displayPrompt();
