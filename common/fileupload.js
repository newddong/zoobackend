// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
var s3config = require("./awsconfig");

var fs = require("fs");
var path = require("path");

// Create S3 service object
s3 = new AWS.S3(s3config);

var fileUpload = (localfile, bucketpath, callback) => {
	let fileStream = fs.createReadStream(localfile);
	fileStream.on("error", function (err) {
		console.log("File Error", err);
	});

	let uploadParams = {
		Bucket: s3config.bucket,
		Key: bucketpath + "/" + path.basename(localfile),
		Body: fileStream,
		ACL: "public-read",
	};

	s3.upload(uploadParams,callback);
};

/*
callback sample
var callback = (err, data) => {
	if (err) {
		console.log("AWS Error ", err);
	}
	if (data) {
		console.log("S3 Upload Success ", JSON.stringify(data));
	}
}
*/
/* 
usage sample
fileUpload('images.jfif','test',(e,d)=>{
	if(e){
		console.log('error',e);
	}
	if(d){
		console.log('success',JSON.stringify(d));
	}
})
/*
success example
success {	"ETag":"\"58f43651f788801680c01948e7bd108e\"",
			"VersionId":"_x52omyIJEmfDamoZwzcSumt4Y29k2To",
			"Location":"https://pinetreegy.s3.ap-northeast-2.amazonaws.com/test/images.jfif",
			"key":"test/images.jfif",
			"Key":"test/images.jfif",
			"Bucket":"pinetreegy"}
*/
module.exports = fileUpload;


