
/*
 * These are server related tasks
 *
 */

var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder
var config = require('./config');
var fs = require('fs');

var functions = require('./functions')
var logger = require('./logger')
var path = require('path');

// Instantite the server module object
var server = {}

// Instantiate the http server
server.httpServer = http.createServer(function(req, res){
	server.unifiedServer(req, res)
});

// Instantiate the https server
server.httpsServerOptions = {
	'key' : fs.readFileSync(path.join(__dirname,'/../https/key.pem')),
	'cert' : fs.readFileSync(path.join(__dirname,'/../https/cert.pem'))
};

server.httpsServer = https.createServer(server.httpsServerOptions,function(req, res) {
	server.unifiedServer(req, res)
});

var parsePath = function(uri_path) {
	var paths = uri_path.split("/")
	return paths
}

server.sendResponse = function(res, statusCode, msg) {
	res.setHeader('Content-Type', 'application/json')
	res.writeHead(statusCode)
	res.end(msg)
}

server.unifiedServer = function(req, res) {
	var parsedUrl = url.parse(req.url, true);
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g,'');

	var query = parsedUrl.query;
	var method = req.method
	var headers = req.headers
	var decoder = new StringDecoder('utf-8');

	var buffer = '';

	logger.log_verbose("Path " + trimmedPath);

	req.on('data', function(data) {
		buffer += decoder.write(data);
	});

	req.on('end', function() {
		buffer += decoder.end()

		
		logger.log_verbose("Buffer " + buffer)

		//TODO(Arpit) Have error handling here to check for incorrect payloads
		payload = {}

		try {
			payload = JSON.parse(buffer);
		} catch (e) {
			logger.log_debug("Buffer not a json " + buffer);
			if (method == 'POST' || method == 'PUT') {
				res.setHeader('Content-Type', 'application/json');
				res.writeHead(500);
				res.end("Invalid Payload");
				logger.log_error("Invalid payload for POST/PUT method")
				return;
			}
		}

		var method = req.method
		logger.log_verbose("Request method: " + method)
		logger.log_verbose("Query "+ JSON.stringify(query))
		logger.log_verbose("Payload"+ JSON.stringify(payload))

		fnc = server.router[method]
		query.path = trimmedPath;

		paths = parsePath(query.path);

		if (paths[0] == "authors" || paths[0] == "posts") {
			fnc(payload, query, function(statusCode, msg) {
				statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
				server.sendResponse(res, statusCode, msg);
			});
		} else {
			server.sendResponse(res, 500, "Invalid resource path");
		}
	})
};

// Define a request router
server.router = {
	'GET': functions.get,
	'POST': functions.post,
	'PATCH': functions.patch,
	'DELETE': functions.delete,
	'PUT': functions.put
}

server.init = function() {
	//Start the HTTP server
	server.httpServer.listen(config.httpPort, function(){
		logger.log_debug("The server is listening on port "+config.httpPort+" in "+config.envName+" mode");
	});

	// Start the https server
	server.httpsServer.listen(config.httpsPort, function(){
		logger.log_debug("The server is listening on port "+config.httpsPort+" in "+config.envName+" mode");
	})
}

// Export the module
module.exports = server