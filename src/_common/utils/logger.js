import winston from 'winston';
import dailyRotateFile from  'winston-daily-rotate-file';
import {asyncCheckOrMkdir} from './files';
import {resolve} from 'path';
import {time} from './date';

export async function configureLogger(appPath, debug) {
	const tsFormat = () => (new Date()).toLocaleTimeString();
	const consoleLogLevel = debug ? 'debug' : 'info';
	const logDir = resolve(appPath, 'logs');
	await asyncCheckOrMkdir(logDir);

	winston.add(
		new winston.transports.Console({
			timestamp: tsFormat,
			level: consoleLogLevel,
			colorize: true,
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf(info => `${time()} - ${info.level}: ${info.message}`)
			)
		})
	);
	winston.add(
		new dailyRotateFile({
			timestamp: tsFormat,
			filename: 'karaokemugen%DATE%.log',
			dirname: logDir,
			zippedArchive: true,
			level: 'debug',
			handleExceptions: true
		})
	);
}
