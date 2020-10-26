

var fs = require('fs');
var path = require('path');

const log_levels = {
    Error: 'error',
    Debug: 'debug',
    Verbose: 'verbose'
}

var logger = {};

var add_log = function(log, level) {
	var file_name = 'debug.log'
	switch(level) {
		case log_levels.Error:
			file_name = "error.log";
			break;
		case log_levels.Debug:
			file_name = "debug.log";
			break;
		case log_levels.Verbose:
			file_name = "verbose.log";
			break;
	}

	var file_path = path.join(__dirname,'/../logs/'+file_name)
	log.time = Date.now()

	fs.appendFile(file_path, JSON.stringify(log)+"\n", (err) => {
		if (err) {
			console.log("File logging error");
		}
	})
}

logger.log_debug = function(msg) {
	var log = {};
	log.msg = msg;
	log.time = Date.now();

	add_log(log, log_levels.Debug);
	console.log("Log D",log);
}

logger.log_error = function(msg) {
	var log = {};
	log.msg = msg;
	log.time = Date.now();

	add_log(log, log_levels.Error);
	console.log("Log E",log);
}

logger.log_verbose = function(msg) {
	var log = {};
	log.msg = msg;
	log.time = Date.now();

	console.log("Verbose log", msg);
	add_log(log, log_levels.Verbose);
	console.log("Log V",log);
}

module.exports = logger
