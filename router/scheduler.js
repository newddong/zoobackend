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
const axios = require('axios');

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

//보호소 이름으로 userObject에서 _id값을 가져옴
async function checkAddress(data) {
	let dataArray = data.split(' ');
	dataArray[0] = dataArray[0].substr(0, 2);
	let result = '';
	for (let i = 0; i < dataArray.length; i++) {
		if (i < dataArray.length - 1) result += dataArray[i] + ' ';
		else result += dataArray[i];
	}
	return result;
}

//공공데이터를 애니로그 스키마에 맞게 파싱
async function parseDataForDB(type, petData) {
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
			let ageData = petData.substr(0, 4);
			let age = year - parseInt(ageData);
			result = {age: age};
			break;
		case 'weight':
			let index = petData.indexOf('(');
			let weight = petData.substr(0, index);
			result = {weight: weight};
			break;
		case 'processState':
			if (petData == '보호중') {
				result = {animal: 'rescue', status: 'rescue'};
			} else if (petData == '공고중') {
				result = {animal: 'rescue', status: 'notice'};
			} else if (petData == '종료(자연사)') {
				result = {animal: 'rainbowbridge', status: 'rainbowbridge'};
			} else if (petData == '종료(반환)') {
				result = {animal: 'return', status: 'complete'};
			} else if (petData == '종료(입양)') {
				result = {animal: 'adopt', status: 'complete'};
			}
			break;
		case 'sex':
			if (petData == 'M') {
				result = {sex: 'male'};
			} else if (petData == 'F') {
				result = {sex: 'female'};
			} else result = {sex: 'unknown'};
			break;
		case 'neuter':
			if (petData == 'Y') {
				result = {neuter: 'yes'};
			} else if (petData == 'N') {
				result = {neuter: 'no'};
			} else result = {neuter: 'unknown'};
			break;
	}
	return result;
}

//보호소 이름으로 userObject에서 _id값을 가져옴
async function getUserObjectID(shelterName) {
	const userObjectID = await User.model.findOne({user_nickname: shelterName}).select('_id');
	return userObjectID;
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

async function randomString() {
	let chars = '23456789abcdefghkmnprstuvwxyz';
	let string_length = 8;
	let randomstring = '';
	for (let i = 0; i < string_length; i++) {
		let rnum = Math.floor(Math.random() * chars.length);
		randomstring += chars.substring(rnum, rnum + 1);
	}
	return randomstring;
}

async function dateFormatForDB(str) {
	let year = str.substr(0, 4);
	let month = str.substr(4, 2);
	let day = str.substr(6);
	return year + '-' + month + '-' + day;
}

//보호소가 존재하지 않으면 계정 생성
async function checkShelterExist(data) {
	let result = {};
	let phone_number = data.careTel.replace(/[-"]/gi, '');
	result = await User.model.findOne({user_nickname: data.careNm, user_phone_number: phone_number}).exec();
	//계정이 없다면 새로 계정 생성한다.
	if (!result) {
		let shelter_address = {};
		shelter_address.brief = await checkAddress(data.careAddr);
		shelter_address.detail = data.careNm;
		const shelter = await User.makeNewdoc({
			shelter_delegate_contact_number: data.phone_number,
			user_phone_number: phone_number, //대표번호를 자동으로 로그인용 휴대폰 번호로 등록
			shelter_foundation_date: '',
			shelter_homepage: '',
			shelter_name: data.careNm,
			user_nickname: data.careNm,
			user_name: data.careNm,
			shelter_type: 'public',
			user_email: '',
			user_password: await randomString(),
			user_type: 'shelter',
			user_interests: new Object(),
			user_contacted: false,
			user_introduction: data.careNm + '\n' + phone_number,
			shelter_address: shelter_address,
			user_profile_uri: 'https://pinetreegy.s3.ap-northeast-2.amazonaws.com/upload/1652281977128_5febc983-7e6b-44f3-b5e0-09c3ac005464.jpg',
			shelter_delegate_contact_number: phone_number,
		});
		result = await shelter.save();
	}
	return result._id;
}

async function makeDocAndInsertDB(data, userobject_id) {
	let desertionNo = data.desertionNo;
	//사진 퀄리티 때문에 무조건 고화질 사진만 씀.
	let popfile = Array();
	popfile.push(data.popfile);
	let filename = data.popfile;
	let happenDt = data.happenDt;
	let happenPlace = data.happenPlace;
	let kindCd = await parseDataForDB('species', data.kindCd);
	let age = await parseDataForDB('age', data.age);
	let weight = await parseDataForDB('weight', data.weight);
	let processState = await parseDataForDB('processState', data.processState);
	let sexCd = await parseDataForDB('sex', data.sexCd);
	let neuterYn = await parseDataForDB('neuter', data.neuterYn);
	let specialMark = data.specialMark;

	//--현재 쓰이지 않음
	//보호소 이름
	let careNm = data.careNm;
	//보호소 전화번호
	let careTel = data.careTel;
	//보호소 주소
	let careAddr = data.careAddr;
	//사용자 데이터에서 objectID를 가져온다. (DB 덜 거치는 방법 추후 고려)
	let animal_writer_id = getUserObjectID(careNm);
	const protectAnimal = await ShelterAnimal.makeNewdoc({
		protect_animal_photo_uri_list: popfile,
		protect_animal_rescue_date: new Date(await dateFormatForDB(data.happenDt)),
		protect_animal_rescue_location: happenPlace,
		protect_animal_species: kindCd.species,
		protect_animal_species_detail: kindCd.species_detail,
		protect_animal_sex: sexCd.sex,
		protect_animal_neutralization: neuterYn.neuter,
		protect_animal_estimate_age: age.age + '년',
		protect_animal_weight: weight.weight,
		protect_animal_status: processState.animal,
		protect_animal_belonged_shelter_id: userobject_id,
	});
	protectAnimal_result = await protectAnimal.save();

	const protectRequest = await ProtectRequest.makeNewdoc({
		protect_request_title: data.specialMark,
		protect_request_content: data.specialMark,
		protect_request_writer_id: userobject_id,
		protect_animal_species: kindCd.species,
		protect_animal_species_detail: kindCd.species_detail,
		protect_request_photos_uri: popfile,
		protect_request_photo_thumbnail: data.popfile,
		protect_request_notice_sdt: new Date(await dateFormatForDB(data.noticeSdt)),
		protect_request_notice_edt: new Date(await dateFormatForDB(data.noticeEdt)),
		protect_desertion_no: data.desertionNo,
	});
	protectRequest.protect_animal_id = {...protectAnimal};
	protectRequest_result = await protectRequest.save();
}

async function insertPetDataIntoDB(petDataItems) {
	let data = petDataItems.item;
	let dataLength = petDataItems.item.length;
	for (let i = 0; i < dataLength; i++) {
		//보호소 계정 생성 확인(없을 경우 생성)
		userobject_id = await checkShelterExist(data[i]);
		await makeDocAndInsertDB(data[i], userobject_id);
	}
}

router.post('/getCityTypeFromPublicData', (req, res) => {
	controller(req, res, async () => {
		let params = 'ServiceKey=lw1RRanlp%2B6KTO2qlo2i2D0VYissKd4QEm8OhB%2FKAnxcgiwkKNmk%2BzQlUuSBwFmmQYw1dIZNUlSmF7ws0oUUXQ%3D%3D';
		params += '&bgnde=20220511';
		params += '&endde=20220511';
		params += '&numOfRows=1000';
		params += '&pageNo=1';
		params += '&_type=json';
		params += '&upr_cd=6110000';

		let options = {
			method: 'GET', // POST method
			rejectUnauthorized: false,
			url: 'https://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic?' + params,
			headers: {Cookie: 'application/json'},
		};

		let petDataArray;
		request(options, function (error, response, body) {
			if (body != undefined) {
				console.log('크롤링 정상 완료');
				let info = JSON.parse(body);
				petDataArray = info.response.body.items;
				let oriData = insertPetDataIntoDB(petDataArray);
			}
		});
		res.json({status: 200, msg: '--'});
	});
});

module.exports = router;
