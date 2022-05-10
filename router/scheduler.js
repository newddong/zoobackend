const express = require('express');
const router = express.Router();
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

function parseDataForDB(type,petData) {
    switch(type){
        case "species":
            let speciesEndIndex = petData.indexOf(']');
            let species = petData.substr(1, speciesEndIndex - 1);
            let species_detail = petData.substr(speciesEndIndex + 2);
            return {species: species, species_detail: species_detail};
            break;
        case "age":
            let now = new Date();	// 현재 날짜 및 시간
            let year = now.getFullYear();
            let ageData = petData.substr(0, 3);
            let age = year - parseInt(ageData);
            return {age: age};
            break;
        case "weight":
            let index = petData.indexOf('(');
            let weight = petData.substr(0, index-1);
            return {weight: weight};
            break;
        case "status":
            if(petData == '보호중') return {animal : "rescue", status: "rescue"};
            else if(petData == '공고중') return {animal : "rescue",status: "notice"};
            else if(petData == '종료(자연사)') return {animal : "rainbowbridge",status: "rainbowbridge"};
            else if(petData == '종료(반환)') return {animal : "return",status: "complete"};
            else if(petData == '종료(입양)') return {animal : "adopt",status: "complete"};
            break;
        case "sex":
            break;
        case "neuter":
            break;
    }
	
}

async function insertDataIntoDB(data) {
	let dataLength = data.item.length;
	for (let i = 0; i < dataLength; i++) {
		let result = parseDataToDB("species",data.item[i].kindCd);
		console.log('result=>', result.species);
		console.log('species_detail=>', result.species_detail);
		let desertionNo = data.item[i].desertionNo;
		let filename = data.item[i].filename;
		let popfile = data.item[i].popfile;
		let happenDt = data.item[i].happenDt;
		let happenPlace = data.item[i].happenPlace;
		let kindCd = data.item[i].kindCd;
		let age = parseDataForDB(data.item[i].age);
		let weight = data.item[i].weight;
		let processState = data.item[i].processState;

		//데이터 변경 필요
		let sexCd = data.item[i].sexCd;
		let neuterYn = data.item[i].neuterYn;

		let specialMark = data.item[i].specialMark;
		let careNm = data.item[i].careNm;
		let careTel = data.item[i].careTel;
		let careAddr = data.item[i].careAddr;

		const protectAnimal = await ShelterAnimal.makeNewdoc({
			protect_desertion_no: desertionNo,
			protect_animal_photos: filename,
			protect_animal_rescue_date: happenDt,
			protect_animal_rescue_location: happenPlace,
			protect_animal_species: result.species,
			protect_animal_species_detail: result.species_detail,
			protect_animal_sex: sexCd,
			protect_animal_neutralization: neuterYn,
			protect_animal_estimate_age: age,
			protect_animal_weight: weight,
            protect_animal_status:
		
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
