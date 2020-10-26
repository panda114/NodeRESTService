/*
 * Create and xport confiurtaion variables
 *
 */

// Container for all environments
var environment = {};




// Staging (default) environment
environment.staging = {
	'httpPort': 3000,
	'httpsPort': 3001,
	'envName': 'staging'
};


// Production environmnent
environment.production = {
	'httpPort': 5000,
	'httpsPort': 5001,
	'envName': 'production'
}


// Determine which environment was passed as a command-line argument
var currentEnvironment = typeof(process.env.NODE_ENV) == 'string' ? process.env.NODE_ENV.toLowerCase(): '';

// Check that the curretn environnment is one of the environments above, if not, default to staging 
var environmentToExport = typeof(environment[currentEnvironment]) == 'object' ? environment[currentEnvironment]: environment.staging;

// Export the module
module.exports = environmentToExport;
