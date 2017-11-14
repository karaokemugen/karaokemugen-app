

const logger = require('winston');
const express = require('express');
const path = require('path');
const config = require('../_common/utils/config');

module.exports = {
	startExpressReactServer: startExpressReactServer
};


/**
 * Démarrage de l'application Express servant le frontend React, développé dans un sous-projet JS
 * séparé, dans le répertoire 'client'.
 *
 * Servir cette application nécessite qu'elle soit préalablement construite.
 */
function startExpressReactServer(listenPort) {

	const app = express();

	// Serve static files from the React app
	app.use(express.static(path.resolve(__dirname, '../../client/build')));

	// API router
	app.use('/api', apiRouter());

	// The "catchall" handler: for any request that doesn't
	// match one above, send back React's index.html file.
	app.get('*', (req, res) => {
		res.sendFile(path.resolve(__dirname, '../../client/build/index.html'));
	});

	const port = listenPort || 5000;
	app.listen(port);

	logger.info(`[ExpressReact] React frontend app listening on ${port}`);
}

function apiRouter() {
	const apiRouter = express.Router();

	apiRouter.get('/config', (req, res) => {
		res.json(config.getConfig());
	});

	return apiRouter;
}