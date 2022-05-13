module.exports = {
	accessKeyId: process.env.ANILOG_AWS_ACCESSKEYID,
    secretAccessKey: process.env.ANILOG_AWS_SECRETACCESSKEY,
	region: process.env.ANILOG_AWS_REGION,
	apiVersion:process.env.ANILOG_AWS_APIVERSION,
	bucket: process.env.ANILOG_S3BUCKET,
};
