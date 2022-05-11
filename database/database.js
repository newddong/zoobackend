const mongoose = require("mongoose");
const dburl = require("./dburl");

let database;

module.exports = async () => {
	function connectDB() {
		
		let databaseUrl = dburl.url; 

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
