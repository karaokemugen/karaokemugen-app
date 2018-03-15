import localtunnel from 'localtunnel';
import randomstring from 'randomstring';
import {getConfig} from '../_common/utils/config';
import logger from 'winston';
import {promisify} from 'util';
const lt = promisify(localtunnel);

export async function openTunnel() {
	const conf = getConfig();
	const opts = {
		subdomain: randomstring.generate({
			length: 4,
			charset: 'alphabetic',
			capitalization: 'lowercase'
		}),
		host: 'http://kara.moe',
		port: 80
	};	
	const tunnel = await lt(conf.appFrontendPort, opts);
	logger.info(`[Online] Connection established with Shelter (${opts.host}). Your URL is : ${tunnel.url}`);
	tunnel.on('error', (err) => {
		logger.error(`[Online] Connection with ${opts.host} has been lost : ${err}`);
	});	
	return tunnel.url;	
}