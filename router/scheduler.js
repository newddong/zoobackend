const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const ShelterAnimal = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectrequest');
const ProtectActivity = require('../schema/protectionActivityApplicant');
const CommonCode = require('../schema/commoncode');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');
const cron = require('node-cron');
const request = require('request');

// cron.schedule('* * * * *', function () {
// 	let options = {
// 		method: 'GET',
// 		rejectUnauthorized: false,
// 		url: 'https://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic?ServiceKey=lw1RRanlp%2B6KTO2qlo2i2D0VYissKd4QEm8OhB%2FKAnxcgiwkKNmk%2BzQlUuSBwFmmQYw1dIZNUlSmF7ws0oUUXQ%3D%3D&upr_cd=6450000&org_cd=4680000&_type=json',
// 		headers: {Cookie: 'application/json'},
// 	};
// 	console.log('node-cron 실행 테스트');
// 	let oriData = getAbandonedPetFromPublicData(options);
// 	insertDataIntoDB(oriData);
// });

//request 모듈을 통해 데이터를 공공데이터 포털로부터 가져옴.
async function getAbandonedPetFromPublicData(options) {
	// console.log('options=>', options);
	let petDataArray;
	request(options, function (error, response, body) {
		let info = JSON.parse(body);
		petDataArray = info.response.body.items;
		insertDataIntoDB(petDataArray);
	});
	// console.log('petDataArray=>', petDataArray);
}

function parseDataForDB(type, petData) {
	let result = {};
	switch (type) {
		case 'species':
			let speciesEndIndex = petData.indexOf(']');
			let species = petData.substr(1, speciesEndIndex - 1);
			let species_detail = petData.substr(speciesEndIndex + 2);
			result = {species: species, species_detail: species_detail};
			break;
		case 'age':
			let now = new Date(); // 현재 날짜 및 시간
			let year = now.getFullYear();
			let ageData = petData.substr(0, 3);
			let age = year - parseInt(ageData);
			result = {age: age};
			break;
		case 'weight':
			let index = petData.indexOf('(');
			let weight = petData.substr(0, index - 1);
			result = {weight: weight};
			break;
		case 'processState':
			if (petData == '보호중') result = {animal: 'rescue', status: 'rescue'};
			else if (petData == '공고중') result = {animal: 'rescue', status: 'notice'};
			else if (petData == '종료(자연사)') result = {animal: 'rainbowbridge', status: 'rainbowbridge'};
			else if (petData == '종료(반환)') result = {animal: 'return', status: 'complete'};
			else if (petData == '종료(입양)') result = {animal: 'adopt', status: 'complete'};
			break;
		case 'sex':
			if (petData == 'M') result = {sex: 'male'};
			else if (petData == 'F') result = {sex: 'female'};
			else result = {sex: 'unknown'};
			break;
		case 'neuter':
			if (petData == 'Y') result = {neuter: 'yes'};
			else if (petData == 'N') result = {neuter: 'no'};
			else result = {neuter: 'unknown'};
			break;
	}
}

//보호소 이름으로 userObject에서 _id값을 가져옴
function getUserObjectID(shelterName) {
	const userObjectID = await User.model.findOne({user_nickname: shelterName}).select('_id');
	return userObjectID;
}

async function insertDataIntoDB(data) {
	let dataLength = data.item.length;
	for (let i = 0; i < dataLength; i++) {
		console.log('result=>', result.species);
		console.log('species_detail=>', result.species_detail);
		let desertionNo = data.item[i].desertionNo;
		let filename = data.item[i].filename;
		let popfile = data.item[i].popfile;
		let happenDt = data.item[i].happenDt;
		let happenPlace = data.item[i].happenPlace;
		let kindCd = parseDataToDB('species', data.item[i].kindCd);
		let age = parseDataForDB('age', data.item[i].age);
		let weight = parseDataForDB('weight', data.item[i].weight);
		let processState = parseDataForDB('processState', data.item[i].processState);
		let sexCd = parseDataToDB('sec', data.item[i].sexCd);
		let neuterYn = parseDataToDB('neuter', data.item[i].neuterYn);
		let specialMark = data.item[i].specialMark;

		//--현재 쓰이지 않음
		//보호소 이름
		let careNm = data.item[i].careNm;
		//보호소 전화번호
		let careTel = data.item[i].careTel;
		//보호소 주소
		let careAddr = data.item[i].careAddr;

		//사용자 데이터에서 objectID를 가져온다. (DB 덜 거치는 방법 추후 고려)
		let animal_writer_id = getUserObjectID(careNm);

		const protectAnimal = await ShelterAnimal.makeNewdoc({
			protect_desertion_no: desertionNo,
			protect_animal_photos: filename,
			protect_animal_rescue_date: happenDt,
			protect_animal_rescue_location: happenPlace,
			protect_animal_species: result.species,
			protect_animal_species_detail: result.species_detail,
			protect_animal_sex: sexCd.sex,
			protect_animal_neutralization: neuterYn.neuter,
			protect_animal_estimate_age: age.neuter,
			protect_animal_weight: weight.weight,
			protect_animal_status: processState.animal,
			protect_animal_writer_id: animal_writer_id,
		});

		const protectAnimal = await ProtectRequest.makeNewdoc({
			protect_desertion_no: desertionNo,
			protect_animal_photos: filename,
			protect_animal_rescue_date: happenDt,
			protect_animal_rescue_location: happenPlace,
			protect_animal_species: result.species,
			protect_animal_species_detail: result.species_detail,
			protect_animal_sex: sexCd.sex,
			protect_animal_neutralization: neuterYn.neuter,
			protect_animal_estimate_age: age.neuter,
			protect_animal_weight: weight.weight,
			protect_animal_status: processState.animal,
		});
	}
}

router.post('/publicDataTest', (req, res) => {
	controller(req, res, async () => {
		let options = {
			method: 'GET',
			rejectUnauthorized: false,
			url: 'https://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic?ServiceKey=lw1RRanlp%2B6KTO2qlo2i2D0VYissKd4QEm8OhB%2FKAnxcgiwkKNmk%2BzQlUuSBwFmmQYw1dIZNUlSmF7ws0oUUXQ%3D%3D&upr_cd=6450000&org_cd=4680000&_type=json',
			headers: {Cookie: 'application/json'},
		};
		console.log('node-cron 실행 테스트');
		let oriData = await getAbandonedPetFromPublicData(options);

		res.json({status: 200, msg: '---'});
	});
});

module.exports = router;
