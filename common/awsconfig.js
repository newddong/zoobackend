var credentials = require("./awscredentials");

module.exports = {
	...credentials,
	region: "ap-northeast-2",
	apiVersion: "2006-03-01",
    bucket: "pinetreegy",
};
