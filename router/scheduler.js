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
global.change_totalCount = 0;
global.change_endNumber = 0;

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
			weight = weight.replace('?', '0');
			result = {weight: weight};
			break;
		case 'processState':
			if (petData == '보호중') {
				result = {animal: 'rescue', status: 'rescue'};
			} else if (petData == '공고중') {
				result = {animal: 'rescue', status: 'notice'};
			} else if (petData == '종료(자연사)') {
				result = {animal: 'rainbowbridge', status: 'rainbowbridge'};
			} else if (petData == '종료(안락사)') {
				result = {animal: 'rainbowbridge_euthanasia', status: 'rainbowbridge_euthanasia'};
			} else if (petData == '종료(반환)') {
				result = {animal: 'found', status: 'found'};
			} else if (petData == '종료(입양)') {
				result = {animal: 'adopt', status: 'complete'};
			} else if (petData == '종료(기증)') {
				result = {animal: 'donation', status: 'donation'};
			} else if (petData == '종료(방사)') {
				result = {animal: 'release', status: 'release'};
			}
			break;
		case 'checkProcessState':
			if (petData == 'rescue') {
				result = {status: '보호중'};
			} else if (petData == 'notice') {
				result = {status: '공고중'};
			} else if (petData == 'rainbowbridge') {
				result = {status: '종료(자연사)'};
			} else if (petData == 'rainbowbridge_euthanasia') {
				result = {status: '종료(안락사)'};
			} else if (petData == 'found') {
				result = {status: '종료(반환)'};
			} else if (petData == 'complete') {
				result = {status: '종료(입양)'};
			} else if (petData == 'donation') {
				result = {status: '종료(기증)'};
			} else if (petData == 'release') {
				result = {status: '종료(방사)'};
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

	//보호소 계정확인
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
			user_profile_uri: 'https://pinetreegy.s3.ap-northeast-2.amazonaws.com/upload/1652351934385_6346cd21-25e7-4fa3-be06-ec7ddd85c880.jpg',
			shelter_delegate_contact_number: phone_number,
		});
		result = await shelter.save();
	} else {
	}
	return result._id;
}

async function makeDocAndInsertDB(data, userobject_id) {
	let desertionNo = data.desertionNo;

	//상태가 공고중이면서 desertionNo 번호가 ProtectRequest 컬렉션에 존재할 경우 리턴시킴

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
	let noticeNo = data.noticeNo;
	let colorCd = data.colorCd;

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
		protect_desertion_no: desertionNo,
		protect_animal_noticeNo: noticeNo,
	});
	protectAnimal_result = await protectAnimal.save();

	const protectRequest = await ProtectRequest.makeNewdoc({
		protect_request_title: data.specialMark,
		protect_request_content: data.specialMark + '\n색:' + colorCd,
		protect_request_writer_id: userobject_id,
		protect_animal_species: kindCd.species,
		protect_animal_species_detail: kindCd.species_detail,
		protect_request_photos_uri: popfile,
		protect_request_photo_thumbnail: data.popfile,
		protect_request_notice_sdt: new Date(await dateFormatForDB(data.noticeSdt)),
		protect_request_notice_edt: new Date(await dateFormatForDB(data.noticeEdt)),
		protect_desertion_no: desertionNo,
		protect_animal_noticeNo: noticeNo,
	});
	protectRequest.protect_animal_id = {...protectAnimal};
	protectRequest_result = await protectRequest.save();
}

async function insertPetDataIntoDB(petDataItems) {
	let data = petDataItems.item;
	let dataLength = petDataItems.item.length;
	let count = 0;
	for (let i = 0; i < dataLength; i++) {
		//보호소 계정 생성 확인(없을 경우 생성)
		//보호소 존재 여부 확인 후 useronbject_id를 가져 옴.
		userobject_id = await checkShelterExist(data[i]);

		//유기번호가 ProtectRequestObject에 존재하지 않을 경우 makeDocAndInsertDB 함수 진행, 존재할 경우 보호 상태 업데이트 진행
		protectRequestInfo = await ProtectRequest.model.findOne({protect_desertion_no: data[i].desertionNo}).exec();

		if (!protectRequestInfo) {
			//ShelterAnimal 컬렉션과 ProtectRequest 컬렉션에 데이터 insert 진행
			await makeDocAndInsertDB(data[i], userobject_id);
		} else {
			let changedValue = await parseDataForDB('checkProcessState', protectRequestInfo.protect_request_status);
			//값이 다를 경우 상태 업데이트
			if (changedValue.status != data[i].processState) {
				count++;
				console.log('------------------------------------------------------');
				console.log('changedValue.status =>', changedValue.status);
				console.log('data[i].processState =>', data[i].processState);
				//보호 요청글 상태 업데이트
				let protect_request_status = await parseDataForDB('processState', data[i].processState);
				protectRequestInfo.protect_request_status = protect_request_status.status;
				console.log('protectRequestInfo_.id =>', protectRequestInfo._id);
				console.log('protectRequestInfo.protect_request_status =>', protectRequestInfo.protect_request_status);
				await protectRequestInfo.save();

				//보호소의 보호중인 동물의 상태 업데이트
				shelterAnimalInfo = await ShelterAnimal.model.findById(protectRequestInfo.protect_animal_id).exec();
				let protect_animal_status = await parseDataForDB('processState', data[i].processState);
				shelterAnimalInfo.protect_animal_status = protect_animal_status.animal;
				console.log('shelterAnimalInfo.id =>', shelterAnimalInfo._id);
				console.log('shelterAnimalInfo.protect_animal_status =>', shelterAnimalInfo.protect_animal_status);
				await shelterAnimalInfo.save();
			}
		}
	}
	change_totalCount++;
	console.log('count------------', count);
	console.log('totalCount------------', change_totalCount);
	if (change_endNumber == change_totalCount) {
		console.log('last change_endNumber------------', change_totalCount);
	}
}

async function insertSidoDataIntoDB(dataItems) {
	let data = dataItems.item;
	let dataLength = dataItems.item.length;
	for (let i = 0; i < dataLength; i++) {
		//CommonCode 컬렉션에 시도 정보 업데이트(정보 존재할 경우 update, 없을 경우 insert)
		await updateSidoInfo(data[i], userobject_id);
	}
}

const sleep = ms => {
	return new Promise(resolve => {
		setTimeout(resolve, ms);
	});
};

async function settingDataForApi(bgnde, endde, pageNo) {
	let params = 'ServiceKey=lw1RRanlp%2B6KTO2qlo2i2D0VYissKd4QEm8OhB%2FKAnxcgiwkKNmk%2BzQlUuSBwFmmQYw1dIZNUlSmF7ws0oUUXQ%3D%3D';
	params += '&bgnde=' + bgnde;
	params += '&endde=' + endde;
	params += '&numOfRows=1000';
	params += '&pageNo=' + pageNo;
	params += '&_type=json';

	let options = {
		method: 'GET', // POST method
		rejectUnauthorized: false,
		url: 'https://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic?' + params,
		headers: {Cookie: 'application/json'},
	};
	return options;
}

async function accessOpenApi(options) {
	let petDataArray;
	let info;
	return new Promise(function (resolve, reject) {
		request(options, function (error, response, body) {
			if (body != undefined) {
				info = JSON.parse(body);
				petDataArray = info.response.body.items;
				let oriData = insertPetDataIntoDB(petDataArray);
				resolve(info.response.body.totalCount);
			}
		});
	});
}

router.post('/getCityTypeFromPublicData', (req, res) => {
	controller(req, res, async () => {
		let bgnde = req.body.bgnde;
		change_totalCount = 0;
		change_endNumber = 1;
		if (req.body.endde == undefined) {
			req.body.endde = '';
		}
		let endde = req.body.endde;
		let pageNo = 1;

		//openapi 설정값 셋팅
		options = await settingDataForApi(bgnde, endde, pageNo);

		console.log('options=>', options);

		//크롤링 진행
		let totalCount = await accessOpenApi(options);

		console.log('totalCount=>', totalCount);

		//크롤링을 진행 후 totalCount 카운트가 1000 초과시 1000을 나눈 몫만큼 반복
		if (totalCount > 1000) {
			maxLength = parseInt(totalCount / 1000) + 1;
			change_endNumber = maxLength;
			for (let i = 2; i <= maxLength; i++) {
				options = await settingDataForApi(bgnde, endde, i);
				console.log('options=>', options);
				//크롤링 진행
				await accessOpenApi(options);
			}
		}

		res.json({status: 200, msg: '크롤링 종료'});
	});
});

router.post('/deletePublicData', (req, res) => {
	controller(req, res, async () => {
		// let ProtectRequestListForDelete = await ProtectRequest.model.find({protect_desertion_no: {$exists: true}}).exec();
		// for (let i = 0; i < ProtectRequestListForDelete.length; i++) {
		// 	// console.log('ProtectRequestListForDelete.protect_animal_id._id=>', ProtectRequestListForDelete[i].protect_animal_id._id);
		// 	await ShelterAnimal.model.deleteOne({_id: ProtectRequestListForDelete[i].protect_animal_id._id});
		// }
		await ShelterAnimal.model.deleteMany({protect_desertion_no: {$exists: true}}).lean();
		await ProtectRequest.model.deleteMany({protect_desertion_no: {$exists: true}}).lean();
		res.json({status: 200, msg: '--'});
	});
});

async function settingSidoForApi(urlInfo, paramsList) {
	let params = 'ServiceKey=lw1RRanlp%2B6KTO2qlo2i2D0VYissKd4QEm8OhB%2FKAnxcgiwkKNmk%2BzQlUuSBwFmmQYw1dIZNUlSmF7ws0oUUXQ%3D%3D';
	params += '&_type=json';
	if (paramsList != '') params += paramsList;

	let options = {
		method: 'GET', // POST method
		rejectUnauthorized: false,
		url: urlInfo + params,
		headers: {Cookie: 'application/json'},
	};
	return options;
}

async function accessForShelterOpenApi(options) {
	let petDataArray;
	let info;
	return new Promise(function (resolve, reject) {
		request(options, function (error, response, body) {
			if (body != undefined) {
				info = JSON.parse(body);
				petDataArray = info.response.body.items;
				resolve(petDataArray);
			}
		});
	});
}

router.post('/getPublicShelterData', (req, res) => {
	controller(req, res, async () => {
		let sidoUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/sido?';
		let options = await settingSidoForApi(sidoUrl, '');
		let sidoDataList = await accessForShelterOpenApi(options);

		let sigunguUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/sigungu?';
		let paramsList;
		if (sidoDataList.item) {
			for (let i = 0; i < sidoDataList.item.length; i++) {
				paramsList = '';
				paramsList = '&upr_cd=' + sidoDataList.item[i].orgCd;
				options = await settingSidoForApi(sigunguUrl, paramsList);
				let sigunguDataList = await accessForShelterOpenApi(options);
				await sleep(500);
				if (sigunguDataList.item) {
					for (let j = 0; j < sigunguDataList.item.length; j++) {
						paramsList = '';
						let shelterUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/shelter?';
						paramsList = '&upr_cd=' + sigunguDataList.item[j].uprCd;
						paramsList += '&org_cd=' + sigunguDataList.item[j].orgCd;
						options = await settingSidoForApi(shelterUrl, paramsList);
						let shelterDataList = await accessForShelterOpenApi(options);
						await sleep(500);

						if (shelterDataList.item) {
							for (let k = 0; k < shelterDataList.item.length; k++) {
								paramsList = '';
								let abandonmentPublicUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic?';
								paramsList = '&care_reg_no=' + shelterDataList.item[k].careRegNo;
								options = await settingSidoForApi(abandonmentPublicUrl, paramsList);
								let abandonmentPublicDataList = await accessForShelterOpenApi(options);
								if (abandonmentPublicDataList.item) {
									let shlterDetaildata = abandonmentPublicDataList.item[0];
									checkShelterExist(shlterDetaildata);
								}
								await sleep(500);
							}
						}
					}
				}
			}
		}
		res.json({status: 200, msg: '--'});
	});
});

module.exports = router;
