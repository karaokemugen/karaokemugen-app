import localtunnel from 'localtunnel';

const opts = {
	host: 'http://test.shelter.moe:8899',	
};

const tunnel = localtunnel(1337, opts, (err, tunnel) => {
	console.log('Tunnel 1337 is : '+tunnel.url);
});