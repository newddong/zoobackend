
let config = undefined;
let appconfig = undefined;
if(process.env.ANILOG_ENV!='production'&&process.env.ANILOG_ENV!='dev'){
	config = require('./awscredentials');
	console.log('not production dev',config);
	appconfig = config;
	
}else{
	console.log('production dev');
	appconfig = {
		accessKeyId: process.env.ANILOG_AWS_ACCESSKEYID,
		secretAccessKey: process.env.ANILOG_AWS_SECRETACCESSKEY,
		region: process.env.ANILOG_AWS_REGION,
		apiVersion:process.env.ANILOG_AWS_APIVERSION,
		bucket: process.env.ANILOG_S3BUCKET,
	}
}
module.exports = {...appconfig};