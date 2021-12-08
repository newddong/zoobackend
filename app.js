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
const expressJSDocSwagger = require('express-jsdoc-swagger');

/** Swagger 옵션 */
const options = {
	info: {
		version: '1.0.0',
		title: 'Albums store',
		license: {
			name: 'MITT',
		},
	},
	security: {
		BasicAuth: {
			type: 'http',
			scheme: 'basic',
		},
	},
	baseDir: __dirname,
	// Glob pattern to find your jsdoc files (multiple patterns can be added in an array)
	// Ant format
	filesPattern: './**/*.js',
	// URL where SwaggerUI will be rendered
	swaggerUIPath: '/api-docs',
	// Expose OpenAPI UI
	exposeSwaggerUI: true,
	// Expose Open API JSON Docs documentation in `apiDocsPath` path.
	exposeApiDocs: false,
	// Open API JSON Docs endpoint.
	apiDocsPath: '/v3/api-docs',
	// Set non-required fields as nullable by default
	notRequiredAsNullable: false,
	// You can customize your UI options.
	// you can extend swagger-ui-express config. You can checkout an example of this
	// in the `example/configuration/swaggerOptions.js`
	swaggerUiOptions: {},
};

const app = express();
app.set('port', process.env.PORT || 3000); //Port 설정



app.use(express.urlencoded({extended: false}));
app.use(express.json());
app.use(cookieParser());
app.use(cors());
app.use(
	expressSession({
		secret: 'zoodoongi.pinetree.gylee',
		resave: false,
		saveUninitialized: true,
		store: MongoStore.create({
			mongoUrl: 'mongodb://app:appkeeper!@zoodoongi.net:27017',
			dbName: 'app',
		}),
	}),
);

expressJSDocSwagger(app)(options);

//Routers
const userRoute = require('./router/user');
const postRoute = require('./router/post');
const appauth = require('./router/appauth');
const comment = require('./router/comment');
const database = require('./database/database');
const router = express.Router();


const dbconnection = database();

//Api routes
app.use('/auth', appauth);
app.use('/user', userRoute);
app.use('/post', postRoute);
app.use('/comment', comment);
app.use('/', router);

//Launch Server
http.createServer(app).listen(app.get('port'), function () {
	console.log('서버가 %d포트에서 시작되었습니다. ', app.get('port'));
});
