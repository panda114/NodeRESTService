

var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder
var config = require('./config');
var fs = require('fs');

var functions = require('./lib/functions')

var populatePayload = function(payload, query) {
	if (query.author) {
		payload.author = query.author
	}
	if (query.title) {
		payload.title = query.title
	}
	if (query._sort) {
		payload._sort = query._sort
	}
	if (query._order) {
		payload._order = query._order
	}
}

var unifiedServer = function(req, res) { 
	var parsedUrl = url.parse(req.url, true);
	var path = parsedUrl.pathname;
	var trimmedPath = path.replace(/^\/+|\/+$/g,'');
	
	var query = parsedUrl.query;
	var method = req.method
	var headers = req.headers
	var decoder = new StringDecoder('utf-8');

	var buffer = '';
	req.on('data', function(data) {
		buffer += decoder.write(data);
	});

	req.on('end', function() {
		buffer += decoder.end()

		var method = req.method
		console.log("Request method: ",method,typeof(method))
		console.log("Query ", query)
		fnc = router[method]

		pid = query.pid
		payload = {"pid": pid}

		populatePayload(payload, query)

		console.log("Payload populated ",payload)

		if (query.author) {
			payload.author = query.author
		}


		fnc(pid, payload, function(statusCode, msg) {
				statusCode = typeof(statusCode) == 'number' ? statusCode : 200;

				res.setHeader('Content-Type', 'application/json')
				res.writeHead(statusCode)
				res.end(msg)
		});

			
	})
};

// Instantiate the http server
var httpServer = http.createServer(function(req, res){
	unifiedServer(req, res)
});

//Start the server
httpServer.listen(config.httpPort, function(){
	console.log("The server is listening on port "+config.httpPort+" in "+config.envName+" mode");
})

// Instantiate the https server
var httpsServerOptions = {
	'key' : fs.readFileSync('./https/key.pem'),
	'cert' : fs.readFileSync('./https/cert.pem')
};

var httpsServer = https.createServer(httpsServerOptions,function(req, res) {
	unifiedServer(req, res)
});

// Start the https server
httpsServer.listen(config.httpsPort, function(){
	console.log("The server is listening on port "+config.httpsPort+" in "+config.envName+" mode");
})

// Define a request router
var router = {
	'GET': functions.get,
	'POST': functions.post,
	'PATCH': functions.patch,
	'DELETE': functions.delete,
	'PUT': functions.put
}

