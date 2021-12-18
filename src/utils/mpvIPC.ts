import { ChildProcess, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { Socket } from 'net';

import { MpvCommand } from '../types/mpvIPC';

class Mpv extends EventEmitter {
	binary: string;
	socketlink: string;
	args: string[];
	socket: Socket;
	isRunning: boolean;
	observedProperties: string[];
	program: ChildProcess;
	lastCommandId: number;

	constructor(binary: string, socket: string, args: string[]) {
		super();
		this.binary = binary;
		this.socketlink = socket;
		this.args = args;
		this.socket = new Socket();
		this.isRunning = false;
		this.observedProperties = [];
		this.lastCommandId = 0;
		this.setupEvents();
	}

	private genCommand(): [string, string[]] {
		return [
			this.binary,
			['--idle', '--msg-level=all=no,ipc=v', `--input-ipc-server=${this.socketlink}`, ...this.args],
		];
	}

	private launchMpv() {
		return new Promise<void>((resolve, reject) => {
			setTimeout(reject, 10000, new Error('Timeout')); // Set timeout to avoid hangs
			const command = this.genCommand();
			const program = spawn(...command, { stdio: ['ignore', 'pipe', 'pipe'] });
			program.once('error', err => {
				reject(err);
			});
			program.once('exit', code => {
				if (code !== 0) reject(new Error(`Mpv process exited with ${code}`));
				this.destroyConnection(code !== 0);
			});
			program.stdout.on('data', data => {
				const str = data.toString();
				if (str.match(/Listening to IPC (socket|pipe)/)) {
					program.stdout.removeAllListeners();
					program.stderr.removeAllListeners();
					program.stdout.destroy();
					program.stderr.destroy();
					resolve();
				}
			});
			program.stderr.on('data', data => {
				const str = data.toString();
				if (str.match(/Could not bind IPC (socket|pipe)/)) {
					program.stdout.removeAllListeners();
					program.stderr.removeAllListeners();
					program.stdout.destroy();
					program.stderr.destroy();
					program.kill('SIGINT');
					reject(new Error(str));
				}
			});
			this.program = program;
		});
	}

	private setupSocket() {
		return new Promise<void>((resolve, reject) => {
			this.socket.connect(this.socketlink, resolve);
			this.socket.setEncoding('utf8');
			this.socket.once('error', reject);
		});
	}

	private setupEvents() {
		// Connected hook
		this.socket.once('connect', async () => {
			await this.ishukan({ command: ['disable_event', 'all'] });
			await this.ishukan({ command: ['enable_event', 'client-message'] });
		});
		// Observe hook
		this.socket.on('data', (data: string) => {
			data.split('\n').forEach(line => {
				if (line.length > 0) {
					const payload = JSON.parse(line);
					if (payload?.event) {
						this.emit(payload.event, payload);
					} else {
						this.emit('output', payload);
					}
				}
			});
		});
		// Disconnect hook
		this.socket.on('close', (err: boolean) => {
			this.destroyConnection(err);
		});
		this.socket.unref();
	}

	private genCommandId() {
		if (this.lastCommandId > 999) this.lastCommandId = 0;
		return ++this.lastCommandId;
	}

	private ishukan(command: MpvCommand) {
		// LET'S ishukan COMMUNICATION :) (come on it's funny)
		return new Promise((resolve, reject) => {
			const req_id = this.genCommandId();
			const command_with_id = { ...command, request_id: req_id, async: true };
			const dataHandler = (data: Record<string, any>) => {
				if (req_id === data.request_id) {
					data.error === 'success' ? resolve(data) : reject(data);
					this.off('output', dataHandler);
					this.socket.off('error', reject);
				}
			};
			try {
				if (!this.socket.writable) {
					// IT SHOULDN'T HAPPEN BUT WHATEVER.
					this.destroyConnection(true);
					reject(new Error('The socket is not writable'));
				} else {
					this.on('output', dataHandler);
					this.socket.once('error', reject);
					this.socket.write(`${JSON.stringify(command_with_id)}\n`, 'utf8', err => {
						if (err) reject(err);
					});
				}
			} catch (err) {
				reject(err);
				this.off('output', dataHandler);
				this.socket.off('error', reject);
			}
		});
	}

	private destroyConnection(err: boolean) {
		if (!this.isRunning) {
			// If isRunning is false this means this function was already triggered by another node event
			return;
		}
		this.isRunning = false;
		this.observedProperties = [];
		this.socket.removeAllListeners();
		this.socket.destroy();
		if (!this.program.exitCode) this.program.kill('SIGINT');
		this.emit('close', err);
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
		await this.ishukan({ command: ['quit'] }).catch(_err => {
			// Ow. mpv is probably already dying, just destroy the connection
		});
		this.destroyConnection(false);
		return true;
	}

	send(command: MpvCommand) {
		if (this.isRunning) return this.ishukan(command);
		else throw new Error('MPV is not running');
	}

	async observeProperty(property: string) {
		let id;
		if (this.isRunning) {
			id = this.observedProperties.length;
			this.observedProperties.push(property);
			await this.ishukan({ command: ['observe_property', id, property] }).catch(err => {
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
		await this.ishukan({ command: ['unobserve_property', id] });
		delete this.observedProperties[id];
		return;
	}
}

export default Mpv;
