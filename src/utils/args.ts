import { Command } from 'commander';
import { app, CommandLine } from 'electron';

import logger, { enableProfiling } from '../lib/utils/logger';
import {getState, setState} from './state';

export function parseArgs() {
	const version = getState().version;
	const program = new Command();
	return program
		.description('Starts Karaoke Mugen Desktop App')
		.version(`${version.number} "${version.name}" (commit ${version.sha})`)
		.option('-c, --config [file]','Specify a config file to use (default is config.yml)')
		.option('-d, --debug', 'Displays additional debug messages')
		.option('-g, --generate', 'Generates a new database then quits')
		.option('-k, --kill', 'Kill already-running KM app')
		.option('-p, --profiling', 'Displays profiling information for some functions')
		.option('-r, --reset', 'Reset user data (WARNING! Backup your base first!)')
		.option('-s, --strict', 'Generation/validation only. Strict mode, returns an error if kara files had to be modified.')
		.option('-t, --test', 'Launches in test mode (for running unit tests)')
		.option('-u, --updateBase', 'Update karaoke base files')
		.option('-v, --validate', 'Validates kara files and modify them if needed (no generation)')
		.option('--cli', 'Start in CLI mode, without Electron')
		.option('--demo', 'Launches in demo mode (no system panel, no password changes)')
		.option('--dumpDB', 'Dumps database and exits')
		.option('--forceAdminPassword [password]', 'Set admin account\'s password')
		.option('--noBaseCheck', 'Disable data file checking on startup')
		.option('--noBrowser', 'Do not open a browser window upon launch')
		.option('--noMedia', '(generation only) Do not try to fetch data from media files')
		.option('--noPlayer', 'Do not open player on startup')
		.option('--noAutoTest', 'Do not attempt to start tests automatically if --test is enabled')
		.option('--restoreDB', 'Restores database and exits')
		.option('--sql', 'Traces SQL query at the debug log level')
		.option('--updateMediasAll', 'Update karaoke media files only (no other data files)')
		.allowUnknownOption()
		.parse();
}

export function setupFromCommandLineArgs(argv: any, cmdline: CommandLine) {
	if (argv.opts().sql) {
		logger.info('SQL queries will be logged', {service: 'Launcher'});
		setState({opt: {sql: true}});
	}
	if (argv.opts().cli) {
		logger.info('CLI mode activated', {service: 'Launcher'});
		setState({opt: {cli: true}});
	}
	if (argv.opts().debug) {
		logger.info('Debug messages enabled on console', {service: 'Launcher'});
		setState({opt: {debug: true}});
		process.env['NODE_ENV'] = 'development';
	}
	if (argv.opts().validate) {
		logger.info('Validation (no generation) requested', {service: 'Launcher'});
		setState({opt: {validate: true}});
	}
	if (argv.opts().reset) {
		logger.warn('USER DATA IS GOING TO BE RESET', {service: 'Launcher'});
		setState({opt: {reset: true}});
	}
	if (argv.opts().profiling) {
		logger.info('Profiling enabled', {service: 'Launcher'});
		enableProfiling();
	}
	if (argv.opts().generate) {
		logger.info('Database generation requested', {service: 'Launcher'});
		setState({opt: {generateDB: true}});
	}
	if (argv.opts().noMedia) {
		logger.info('Medias will not be read during generation', {service: 'Launcher'});
		setState({opt: {noMedia: true}});
	}
	if (argv.opts().noBaseCheck) {
		logger.info('Data files will not be checked. ENABLED AT YOUR OWN RISK', {service: 'Launcher'});
		setState({opt: {noBaseCheck: true}});
	}
	if (argv.opts().noPlayer) {
		logger.info('Player will not start.', {service: 'Launcher'});
		setState({opt: {noPlayer: true}});
	}
	if (argv.opts().strict) {
		logger.info('Strict mode enabled. KARAOKE MUGEN DOES NOT FORGIVE. EVER.', {service: 'Launcher'});
		setState({opt: {strict: true}});
	}
	if (argv.opts().updateBase) {
		logger.info('Base update requested', {service: 'Launcher'});
		setState({opt: {baseUpdate: true}});
	}
	if (argv.opts().updateMediasAll) {
		logger.info('Full media update requested', {service: 'Launcher'});
		setState({opt: {mediaUpdateAll: true}});
	}
	if (argv.opts().test && !app.isPackaged) {
		logger.info('TEST MODE ENABLED. DO NOT DO THIS AT HOME.', {service: 'Launcher'});
		if (argv.opts().noAutoTest) setState({noAutoTest: true});
		setState({isTest: true});
	}
	if (argv.opts().demo) {
		logger.info('Demo mode enabled', {service: 'Launcher'});
		setState({isDemo: true});
	}
	if (argv.opts().noBrowser) setState({opt: {noBrowser: true}});
	if (argv.opts().noAutoTest) setState({opt: {noAutoTest: true}});
	if (argv.opts().forceAdminPassword) setState({opt: {forceAdminPassword: argv.opts().forceAdminPassword || cmdline.getSwitchValue('forceAdminPassword')}});
	if (argv.opts().dumpDB) setState({opt: {dumpDB: true}});
	if (argv.opts().restoreDB) setState({opt: {restoreDB: true}});
}
