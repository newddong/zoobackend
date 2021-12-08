const mongoose = require("mongoose");

let database;

module.exports = async () => {
	function connectDB() {
		
		let databaseUrl = "mongodb://app:appkeeper!@zoodoongi.net:27017";
		// var databaseUrl = "mongodb://app:appkeeper!@10.0.21.4:27017"; //서버측 주소(AWS 네트워크 내부에 속해있어야함)

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
