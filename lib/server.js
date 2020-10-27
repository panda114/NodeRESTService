
/*
 * These are server related tasks
 *
 */

var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./config');
var fs = require('fs');

var functions = require('./functions');
var logger = require('./logger');
var path = require('path');

const express = require('express');

const swaggerUi = require('swagger-ui-express');
const openApiDocumentation = require('./openApiDocumentation.json');

// Instantite the server module object
const app = express();

const server = {}
var parsePath = function(uri_path) {
	var paths = uri_path.split("/")
	return paths
}

sendResponse = function(res, statusCode, msg) {
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
				res.writeHead(400);
				res.end("Invalid Payload");
				logger.log_error("Invalid payload for POST/PUT method")
				return;
			}
		}

		var method = req.method
		logger.log_verbose("Request method: " + method)
		logger.log_verbose("Query "+ JSON.stringify(query))
		logger.log_verbose("Payload"+ JSON.stringify(payload))

		fnc = server.routeMap[method]
		query.path = trimmedPath;

		paths = parsePath(query.path);

		if (paths[0] == "authors" || paths[0] == "posts") {
			fnc(payload, query, function(statusCode, msg) {
				statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
				sendResponse(res, statusCode, msg);
			});
		} else {
			sendResponse(res, 400, "Invalid resource path");
		}
	})
};

server.initialize_store = function() {
	const store_path = path.join(__dirname,'/../data/store.json')
	if (fs.existsSync(store_path)) {
		console.log("Store exists");
	} else {
		var store = {}
		store.posts = {}
		store.posts.last_id = 0
		store.posts.index = {}
		store.posts.docs = {}

		store.authors = {}
		store.authors.last_id = 0
		store.authors.index = {}
		store.authors.docs = {}

		fs.writeFileSync(store_path, JSON.stringify(store,null, 4));
	}
}
// Define a request router
server.routeMap = {
	'GET': functions.get,
	'POST': functions.post,
	'PATCH': functions.patch,
	'DELETE': functions.delete,
	'PUT': functions.put
}

server.init = function() {
	server.initialize_store()
	app.listen(3000, () => {
		console.log("Express app listening at port 3000")
	});
	app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocumentation));
}


//This will respond requests for posts
app.get('/posts*', function(req, res) {
	server.unifiedServer(req, res)
})

app.post('/posts*', function(req, res) {
	server.unifiedServer(req, res)
})

app.put('/posts*', function(req, res) {
	server.unifiedServer(req, res)
})

app.patch('/posts*', function(req, res) {
	server.unifiedServer(req, res)
})

app.delete('/posts*', function(req, res) {
	server.unifiedServer(req, res)
})


//This will respond to requests for authors
app.get('/authors*', function(req, res) {
	server.unifiedServer(req, res)
})

app.post('/authors*', function(req, res) {
	server.unifiedServer(req, res)
})

app.put('/authors*', function(req, res) {
	server.unifiedServer(req, res)
})

app.patch('/authors*', function(req, res) {
	server.unifiedServer(req, res)
})

app.delete('/authors*', function(req, res) {
	server.unifiedServer(req, res)
})
// Export the module
module.exports = server