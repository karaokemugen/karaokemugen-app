import {getConfig, setConfig} from './_common/utils/config';
import logger from 'winston';
import {karaGenerationBatch} from './_admin/generate_karasfiles';

const help = `Usage : 

karaokemugen [options]

Options : 
--help        Displays this message
--version     Displays version info
--debug       Displays additional debug messages
--generate    Generates a new database then quits
--validate    Validates/checks/updates .kara files without writing a database then quits
--test        Launches in test mode
--config file Specify a config file to use (default is config.ini)
--updateBase  Update karaoke base files (no generation)
--updateSoft  Update Karaoke Mugen software
--online      Launches in online mode (BETA)
--noBrowser   Do not open a browser window upon launch
--noVideo     (generation only) Do not try to fetch data from video files
`;

export async function parseCommandLineArgs(argv) {	
	const config = getConfig();
	if (argv.help) {
		console.log(help);
		process.exit(0);
	}
	if (argv.version) {
		console.log('Karaoke Mugen '+ config.VersionNo + ' - (' + config.VersionName+')');
		process.exit(0);
	}
	if (argv.generate && !argv.validate) {
		logger.info('[Launcher] Database generation requested');
		setConfig({optGenerateDB: true});
		if (argv.noVideo) {
			logger.info('[Launcher] Videos will not be read during generation');
			setConfig({optNoVideo: true});
		}
	}
	if (argv.validate && !argv.generate) {
		logger.info('[Launcher] .kara folder validation requested');
		setConfig({optValidateKaras: true});
	}
	if (argv.validate && argv.generate) {
		console.log('Error : --validate and --generate are mutually exclusive!');
		process.exit(1);
	}
	if (argv.karagen) {
		logger.info('[Launcher] .kara generation requested');
		await karaGenerationBatch();
		process.exit(0);
	}
	if (argv.updateBase) {
		logger.info('[Launcher] Base update requested');
		setConfig({optBaseUpdate: true});
	}
	if (argv.updateSoft) {
		logger.info('[Launcher] Software update requested');
		setConfig({optSoftUpdate: true});
	}
	if (argv.online) {
		logger.info('[Launcher] Online mode activated');
		setConfig({optOnline: true});
	}
	if (argv.test) {
		logger.info('[Launcher] TEST MODE ENABLED. DO NOT DO THIS AT HOME.');
		setConfig({isTest: true});
	}
	if (argv.noBrowser) setConfig({optNoBrowser: true});
}


