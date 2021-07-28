// Load the SDK and UUID
var AWS = require('aws-sdk');
var uuid = require('uuid');


AWS.config.getCredentials(function(err) {
    console.log("Region: ", AWS.config.region);
  if (err) console.log(err.stack);
  // credentials not loaded
  else {
    console.log("Access key:", AWS.config.credentials.accessKeyId);
  }
});

