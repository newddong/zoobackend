const mongoose = require("mongoose");

let database;
let config;
module.exports = async () => {
	function connectDB() {
		let databaseUrl = process.env.ANILOG_DBURI;
		if(process.env.ANILOG_ENV!='production'&&process.env.ANILOG_ENV!='dev'){
			config = require('../common/awscredentials');
			databaseUrl = config.dburi;
		}
		
		console.log("try to connect database.");

		mongoose.Promise = global.Promise;
		mongoose.connect(databaseUrl,{dbName:'app'}, (err) => {
			if (err) {
				console.error("mongodb connection error", err);
			}
			console.log("mongodb connected");
		});

		database = mongoose.connection;

		database.on("error", console.error.bind(console, "mongoose connection error."));
		
	}
	connectDB();

	database.on("disconnected", function () {
		console.log("disconnected from database. try to connect again after 5s");
		setInterval(connectDB, 5000);
	});
	return await database;
};
