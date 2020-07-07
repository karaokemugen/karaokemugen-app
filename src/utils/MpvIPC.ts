import { spawn } from 'child_process';
import { Socket } from 'net';
import { EventEmitter } from 'events';
import { MpvCommand, SocketType } from '../types/MpvIPC';

class Mpv extends EventEmitter {
	binary: string
	socketlink: string
	args: string[]
	sockets: {
		observe: Socket
		command: Socket
	}
	isRunning: boolean
	observedProperties: string[]

	constructor(binary: string, socket: string, args: string[]) {
		super();
		this.binary = binary;
		this.socketlink = socket;
		this.args = args;
		this.sockets = {
			observe: new Socket(),
			command: new Socket()
		};
		this.isRunning = false;
		this.observedProperties = [];
		this.setupEvents();
	}

	private genCommand() {
		// return [this.binary, ['--idle', '--msg-level=all=no,ipc=v', `--input-ipc-server=${this.socketlink}`, ...this.args]];
		return {
			binary: this.binary,
			options: ['--idle', '--msg-level=all=no,ipc=v', `--input-ipc-server=${this.socketlink}`].concat(this.args)
		};
	}

	private launchMpv() {
		return new Promise((resolve, reject) => {
			setTimeout(reject, 10000, new Error('Timeout')); // Set timeout to avoid hangs
			const command = this.genCommand();
			const program = spawn(command.binary, command.options);
			program.unref(); // Don't lock event loop
			program.once('error', err => {
				reject(err);
			});
			program.once('exit', code => {
				if (code !== 0) reject(new Error(`Mpv process exited with ${code}`));
			});
			program.stdout.on('data', data => {
				const str = data.toString();
				if (str.match(/Listening to IPC (socket|pipe)/)) {
					program.stdout.removeAllListeners();
					program.stderr.removeAllListeners();
					resolve();
				}
			});
			program.stderr.on('data', data => {
				const str = data.toString();
				if (str.match(/Could not bind IPC (socket|pipe)/)){
					program.stdout.removeAllListeners();
					program.stderr.removeAllListeners();
					reject(new Error(str));
				}
			});
		});
	}

	private setupSocket() {
		return new Promise((resolve, reject) => {
			this.sockets.observe.connect(this.socketlink, resolve);
			this.sockets.observe.once('error', reject);
			this.sockets.command.connect(this.socketlink, resolve);
			this.sockets.command.once('error', reject);
		});
	}

	private setupEvents() {
		// Observe hook
		this.sockets.observe.on('data', data => {
			data.toString().split('\n').forEach(line => {
				if (line.length > 0) {
					const payload = JSON.parse(line);
					if (payload?.event) {
						if (payload.event === 'shutdown') {
							this.destroyConnection();
							console.log('reset isRunning');
						} else {
							this.emit(payload.event, payload);
						}
					} else {
						this.emit('output', payload);
					}
				}
			});
		});
		// Disconnect hook
		this.sockets.observe.on('close', (err: boolean) => {
			if (err) {
				this.emit('crashed');
			} else {
				console.log('reset isRunning');
				this.destroyConnection();
				this.emit('shutdown');
			}
		});
	}

	private ishukan(command: MpvCommand, socket: SocketType = 'command') {
		return new Promise((resolve, reject) => {
			// Let's ishukan COMMUNICATION :D (boh si c'est marrant arrête)
			const req_id = Math.round(Math.random() * 1000);
			const command_with_id = {...command, request_id: req_id};
			const dataHandler = data => {
				data.toString().split('\n').forEach((payload: string) => {
					if (payload.length > 0) {
						const res = JSON.parse(payload);
						if (req_id === res.request_id) {
							this.sockets[socket].removeListener('data', dataHandler);
							resolve(res);
							this.sockets[socket].removeListener('error', reject);
						}
					}
				});
			};
			this.sockets[socket].on('data', dataHandler);
			this.sockets[socket].once('error', reject);
			this.sockets[socket].write(`${JSON.stringify(command_with_id)}\n`);
		});
	}

	private destroyConnection() {
		this.isRunning = false;
		this.sockets.command.removeAllListeners();
		this.sockets.observe.removeAllListeners();
		this.sockets.command.destroy();
		this.sockets.observe.destroy();
	}

	async start() {
		if (this.isRunning) throw new Error('MPV is already running');
		await this.launchMpv();
		await this.setupSocket();
		this.isRunning = true;
		this.emit('start');
		return true;
	}

	async stop() {
		if (!this.isRunning) throw new Error('MPV is not running');
		await this.send({command: ['quit']});
		this.isRunning = false;
		this.emit('stop');
		return true;
	}

	async send(command: MpvCommand) {
		if (this.isRunning)
			return await this.ishukan(command);
		else
			throw new Error('MPV is not running');
	}

	async observeProperty(property: string) {
		let id;
		if (this.isRunning) {
			id = this.observedProperties.length;
			this.observedProperties.push(property);
			await this.ishukan({command: ['observe_property', id, property]}, 'observe').catch(err => {
				delete this.observedProperties[id];
				throw err;
			});
			return id;
		} else {
			throw new Error('MPV is not running');
		}
	}

	async unobserveProperty(property: string) {
		const id = this.observedProperties.indexOf(property);
		if (id === -1) throw new Error('This property is not observed');
		if (!this.isRunning) throw new Error('MPV is not running');
		await this.ishukan({command: ['unobserve_property', id]}, 'observe');
		delete this.observedProperties[id];
		return;
	}
}

export default Mpv;
