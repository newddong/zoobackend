const express = require('express');
const router = express.Router();
const Address = require('../schema/address');
const {controller, controllerLoggedIn} = require('./controller');
const {
	ALREADY_LOGIN,
	USER_NOT_FOUND,
	USER_PASSWORD_NOT_VALID,
	LOGOUT_FAILED,
	LOGOUT_SUCCESS,
	USER_NOT_VALID,
	ALERT_DUPLICATE_NICKNAME,
	ALERT_NOT_VALID_USEROBJECT_ID,
	ALERT_NOT_VALID_OBJECT_ID,
	ALERT_NOt_VALID_TARGER_OBJECT_ID,
	ALERT_NO_RESULT,
} = require('./constants');
const fs = require('fs');

//
router.post('/getAddressList', (req, res) => {
	controller(req, res, async () => {
		let city = req.body.city;
		let district = req.body.district;
		let address = [];
		let list = [];
		if (!city && !district) {
			address = await Address.model.distinct('city').exec();
			list = address;
		}

		if (city && !district) {
			address = await Address.model.find({city: city}).exec();
			address.map(v => {
				list.includes(v.district) || list.push(v.district);
			});
            list.shift();
		}

		if (city && district) {
			address = await Address.model.find({city: city, district: district}).exec();
			address.map(v => {
				list.includes(v.neighbor) || list.push(v.neighbor);
			});
            list.shift();
		}

		res.json({status: 200, msg: list});
	});
});

//주소 밀어넣기 파일 경로의 root는 node 명령어의 실행 경로임, 현재 파일이 아님
router.get('/pushAddressFromfile', (req, res) => {
	fs.readFile('./address.txt', {encoding: 'utf-8'}, function (err, data) {
		console.log('파일 다 읽었음');

		let Array = data.split('\r\n');

		Array.forEach(v => {
			let arr = v.split('|');
			Address.makeNewdoc({
				city: arr[0],
				district: arr[1],
				neighbor: arr[2],
			})
				.save()
				.then(r => console.log(r));
		});
	});
    if(!req.session.loginUser){
        req.session.destroy();
    }
	res.json({status: 200});
});

module.exports = router;
