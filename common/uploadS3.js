// Load the AWS SDK for Node.js
var AWS = require("aws-sdk");
var multer = require("multer");
var multerS3 = require("multer-s3");
var s3config = require("./awsconfig");

// Create S3 service object
s3 = new AWS.S3(s3config);

const storage = multerS3({
    s3:s3,
    bucket:s3config.bucket,
    contentType:multerS3.AUTO_CONTENT_TYPE,
    acl:'public-read',
    metadata:(req,file,callback)=>{
        callback(null,{fieldName: file.fieldname})
    },
    key:(req,file,callback)=>{
        callback(null,`upload/${Date.now()}_${file.originalname}`)
    }
})

module.exports = multer({storage:storage});



