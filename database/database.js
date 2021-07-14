const mongoose = require("mongoose");

var database;

module.exports = () => {
	function connectDB() {
		var databaseUrl = "mongodb://root:zookeeper@zoodoongi.net:27017";

		console.log("try to connect database.");

		mongoose.Promise = global.Promise;
		mongoose.connect(databaseUrl, (err) => {
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
};
