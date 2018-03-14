import localtunnel from 'localtunnel';
import randomstring from 'randomstring';
import {getConfig} from '../_common/utils/config';
import logger from 'winston';

let tunnel;
const opts = {
	subdomain: randomstring.generate({
		length: 3,
		charset: 'alphabetic',
		capitalization: 'lowercase'
	}),
	host: 'kara.moe',
	port: 8900
};

export function openTunnel() {
	tunnel = localtunnel(getConfig().appFrontendPort, opts, (err, tunnel) => {	
		return tunnel.url;
	});
}

tunnel.on('error', (err) => {
	logger.error(`[Online] Connection with ${opts.host} has been lost : ${err}`);
	openTunnel();
});

export function closeTunnel() {
	tunnel.close();
}