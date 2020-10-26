
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

	console.log("Path ",trimmedPath);

	req.on('data', function(data) {
		buffer += decoder.write(data);
	});

	req.on('end', function() {
		buffer += decoder.end()

		console.log("Buffer ",buffer," ",typeof(buffer))

		//TODO(Arpit) Have error handling here to check for incorrect payloads
		payload = {}

		try {
			payload = JSON.parse(buffer);
		} catch (e) {
			console.log("Buffer not a json");
			if (method == 'POST' || method == 'PUT') {
				res.setHeader('Content-Type', 'application/json');
				res.writeHead(500);
				res.end("Invalid Payload");
				return;
			}
		}

		var method = req.method
		console.log("Request method: ",method,typeof(method))
		console.log("Query ", query)
		console.log("Payload", payload)
		fnc = server.router[method]

		query.path = trimmedPath;

		fnc(payload, query, function(statusCode, msg) {
				statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
				server.sendResponse(res, statusCode, msg)
		});
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
		console.log("The server is listening on port "+config.httpPort+" in "+config.envName+" mode");
	});

	// Start the https server
	server.httpsServer.listen(config.httpsPort, function(){
		console.log("The server is listening on port "+config.httpsPort+" in "+config.envName+" mode");
	})
}

// Export the module
module.exports = server