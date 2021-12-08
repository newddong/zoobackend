var express = require("express"),
	http = require("http"),
	path = require("path");
var cors = require("cors");
var cookieParser = require("cookie-parser"),
	static = require("serve-static"),
	errorHandler = require("errorhandler");

var expressErrorHandler = require("express-error-handler");
var expressSession = require("express-session");
var MongoStore = require("connect-mongo");

var app = express();
var userRoute = require('./router/user');
var postRoute = require('./router/post');
var appauth = require('./router/appauth');
var comment = require('./router/comment');
var database = require('./database/database');

var dbconnection;
dbconnection = database();

app.set("port", process.env.PORT || 3000);

app.use(express.urlencoded({ extended: false }));

app.use(express.json());

// app.use('/public',static(path.join(__dirname,'public')));

app.use(cookieParser());
app.use(cors());
app.use(
	expressSession({
		secret: "zoodoongi.pinetree.gylee",
		resave: false,
		saveUninitialized: true,
		store:MongoStore.create({
			mongoUrl:"mongodb://app:appkeeper!@zoodoongi.net:27017",
			dbName:'app'
		})
	})
);

var router = express.Router();

// router.route("/showcookie").get(function (req, res) {
// 	console.log("showcookie호출");
// 	res.json(req.cookies);
// });

// router.route("/setcookie").get(function (req, res) {
// 	console.log("set cookie");
// 	res.cookie("user", {
// 		id: "mike",
// 		name: "lky",
// 		authorized: true,
// 	});
// 	res.redirect("/showcookie");
// });




app.use("/auth",appauth);
app.use("/user",userRoute);
app.use("/post",postRoute);
app.use("/comment",comment);
app.use("/", router);

var errorHandler = expressErrorHandler({
	static: {
		404: "./public/404.html",
	},
});

app.use(expressErrorHandler.httpError(404));
app.use(errorHandler);

http.createServer(app).listen(app.get("port"), function () {
	console.log("서버가 시작되었습니다. 포트 : " + app.get("port"));
});
