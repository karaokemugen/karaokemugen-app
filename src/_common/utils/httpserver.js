// mini serveur web (il suffit de lui indiquer le dossier à servir)

const path = require('path');
const http = require('http');
const url = require('url');
const fs = require('fs');

const mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"
};

module.exports = function(httpdocs) {
	return http.createServer(function(request, response) {
		var uri = url.parse(request.url).pathname;
		if (uri == '/') uri = '/index.html';
		var filename = path.join(httpdocs, uri);
		fs.exists(filename, function(exists) {
			if (!exists) {
				response.writeHead(404, {
					"Content-Type": "text/plain"
				});
				response.write("404 Not Found\n" + filename + "\n" + uri);
				response.end();
				return;
			}
			if (fs.statSync(filename).isDirectory()) filename += '/index.html';
			fs.readFile(filename, "binary", function(err, file) {
				if (err) {
					response.writeHead(500, {
						"Content-Type": "text/plain"
					});
					response.write(err + "\n");
					response.end();
					return;
				}
				var mimeType = mimeTypes[filename.split('.').pop()];
				if (!mimeType) {
					mimeType = 'text/plain';
				}
				response.writeHead(200, {
					"Content-Type": mimeType
				});
				response.write(file, "binary");
				response.end();
			});
		});
	});
}