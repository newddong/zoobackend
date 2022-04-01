const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const static = require('serve-static');
const errorHandler = require('errorhandler');
const expressErrorHandler = require('express-error-handler');
const expressSession = require('express-session');
const MongoStore = require('connect-mongo');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
	definition: {
		openapi: '3.0.3',
		info: {
			title: '애니로그 API 테스트 페이지',
			version: '0.1.0',
			description: '애니로그 API 테스트 페이지입니다.',
			contact: {
				name: 'PineFriends',
			},
		},
		servers: [
			{
				url: 'http://localhost:3000',
				description: 'local environment',
			},
			{
				url: 'https://api.zoodoongi.net',
				description: 'dev server',
			},
		],
	},
	apis: ['./router/*.js', './swagger/*.yaml'],
};

const specs = swaggerJsdoc(options);

const app = express();
app.set('trust proxy', true);
app.set('port', process.env.PORT || 3000); //Port 설정

app.use(
	express.json({
		limit: '100mb',
	}),
);
app.use(
	express.urlencoded({
		extended: false,
		limit: '100mb',
		parameterLimit: 1000000,
	}),
);
app.use(cookieParser());
app.use(cors());
app.use(
	expressSession({
		secret: 'zoodoongi.pinetree.gylee',
		resave: false,
		saveUninitialized: false,
		store: MongoStore.create({
			mongoUrl: 'mongodb://app:appkeeper!@zoodoongi.net:27017',
			dbName: 'app',
		}),
		proxy: true,
	}),
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

//Routers
const userRoute = require('./router/user');
const comment = require('./router/comment');
const feedRoute = require('./router/feed');
const shelterRoute = require('./router/shelter');
const database = require('./database/database');
const protectRoute = require('./router/protect');
const volunteer = require('./router/volunteer');
const hash = require('./router/hash');
const address = require('./router/address');
const admin = require('./router/admin');
const interests = require('./router/interests');
const announcement = require('./router/announcement');
const servicecenter = require('./router/servicecenter');
const notice = require('./router/notice');
const settingpublic = require('./router/settingpublic');
const commoncode = require('./router/commoncode');
const helpbycategory = require('./router/helpbycategory');
const qanda = require('./router/qanda');
const community = require('./router/community');
const faq = require('./router/faq');
const termsofservice = require('./router/termsofservice');
const noticeuser = require('./router/noticeuser');
const router = express.Router();
const dbconnection = database();

//Api routes
app.use('/user', userRoute);
app.use('/comment', comment);
app.use('/feed', feedRoute);
app.use('/shelter', shelterRoute);
app.use('/protect', protectRoute);
app.use('/volunteer', volunteer);
app.use('/hash', hash);
app.use('/address', address);
app.use('/admin', admin);
app.use('/interests', interests);
app.use('/announcement', announcement);
app.use('/servicecenter', servicecenter);
app.use('/notice', notice);
app.use('/settingpublic', settingpublic);
app.use('/commoncode', commoncode);
app.use('/helpbycategory', helpbycategory);
app.use('/qanda', qanda);
app.use('/community', community);
app.use('/faq', faq);
app.use('/termsofservice', termsofservice);
app.use('/noticeuser', noticeuser);
app.use('/', router);

//Launch Server
http.createServer(app).listen(app.get('port'), function () {
	console.log('서버가 %d포트에서 시작되었습니다. ', app.get('port'));
});
