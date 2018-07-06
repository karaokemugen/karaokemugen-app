import logger from 'winston';
import dailyRotateFile from  'winston-daily-rotate-file';
import {asyncCheckOrMkdir} from './files';
import {resolve} from 'path';
import {time} from './date';
import {getConfig} from './config';

export async function configureLogger(appPath, debug) {
	const tsFormat = () => (new Date()).toLocaleTimeString();
	const consoleLogLevel = debug ? 'debug' : 'info';
	const logDir = resolve(appPath, 'logs');
	await asyncCheckOrMkdir(logDir);

	logger.add(
		new logger.transports.Console({
			timestamp: tsFormat,
			level: consoleLogLevel,
			colorize: true,
			format: logger.format.combine(
				logger.format.colorize(),
				logger.format.printf(info => `${time()} - ${info.level}: ${info.message}`)
			)
		})
	);
	logger.add(
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

export function profile(func) {
	if (getConfig().optProfiling) logger.profile(func);
}
