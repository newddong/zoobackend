// Load the SDK and UUID
var AWS = require('aws-sdk');
var uuid = require('uuid');

AWS.config.update({region: 'ap-northeast-2'});
// Create S3 service object
s3 = new AWS.S3({apiVersion: '2006-03-01'});

// Call S3 to list the buckets
s3.listBuckets(function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data.Buckets);
  }
});