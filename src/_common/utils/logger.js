import winston from 'winston'; 
import dailyRotateFile from  'winston-daily-rotate-file';
import {asyncCheckOrMkdir} from './files';
import {resolve} from 'path';
import {getConfig} from './config';

export let logger;

export async function configureLogger(appPath, debug) {
	const tsFormat = () => (new Date()).toLocaleTimeString();
	const consoleLogLevel = debug ? 'debug' : 'info';
	const logDir = resolve(appPath, 'logs');
	await asyncCheckOrMkdir(logDir);	

	logger = winston.createLogger({
		transports: [
			new winston.transports.Console({
				timestamp: tsFormat,
				level: consoleLogLevel,
				colorize: true
			}),
			new dailyRotateFile({
				timestamp: tsFormat,
				filename: 'karaokemugen%DATE%.log',
				dirname: logDir,
				zippedArchive: true,
				level: 'debug',
				handleExceptions: true
			})
		]
	});	
}
