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
		openapi:process.env.ANILOG_OPENAPIVER||'1.0',
		info: {
			title: '애니로그 API 테스트 페이지',
			version:process.env.ANILOG_TESTPAGE_VER||'0.0.1',
			description: '애니로그 API 테스트 페이지입니다.',
			contact: {
				name: process.env.ANILOG_CONTACT||'Default Contact'
			},
		},
		servers: [
			{
				url: process.env.ANILOG_SERVERURL||'http://localhost:3000',
				description: process.env.ANILOG_SERVERDESCRIPTION||'no description',
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

let databaseUrl;
if(process.env.ANILOG_ENV!='production'&&process.env.ANILOG_ENV!='dev'){
	config = require('./common/awscredentials');
	databaseUrl = config.dburi;
}
app.use(
	expressSession({
		secret: 'anilog',
		resave: false,
		saveUninitialized: false,
		store: MongoStore.create({
			mongoUrl: databaseUrl||process.env.ANILOG_DBURI,
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
const likeetc = require('./router/likeetc');
const favoriteetc = require('./router/favoriteetc');
const report = require('./router/report');
const scheduler = require('./router/scheduler');
const router = express.Router();
const moment = require('moment-timezone');
//server health
router.get('/', (req, res) => {
	console.log(
		'ip - %s | date - [%s] | method - %s | protocol - %s | host - %s | path - %s health | user - %s | excute API',
		req.headers['x-forwarded-for'],
		moment().tz("Asia/Seoul").format(),
		req.method,
		req.protocol,
		req.hostname,
		req.originalUrl,
		req.session?.loginUser,
	);
	console.log('process env', process.env.ANILOG_ENV);
	res.status(200);
	res.send('server alive');
});
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
app.use('/likeetc', likeetc);
app.use('/favoriteetc', favoriteetc);
app.use('/report', report);
app.use('/scheduler', scheduler);
app.use('/', router);


//Launch Server
http.createServer(app).listen(app.get('port'), function () {
	console.log('서버가 %d포트에서 시작되었습니다. ', app.get('port'));
});
