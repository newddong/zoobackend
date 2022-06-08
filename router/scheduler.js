const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const ShelterAnimal = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectrequest');
const ProtectActivity = require('../schema/protectionActivityApplicant');
const Community = require('../schema/community');
const CommonCode = require('../schema/commoncode');
const Publicdatabyscheduler = require('../schema/publicdatabyscheduler');
const {controller, controllerLoggedIn} = require('./controller');
const {ALERT_NOT_VALID_OBJECT_ID, ALERT_NO_RESULT, ALERT_NO_MATCHING} = require('./constants');
const mongoose = require('mongoose');
const cron = require('node-cron');
const request = require('request');
global.crolling_totalCount = 0; //수집 데이터 총 건수
global.insert_totalCount = 0; //수집 데이터 대상 신규 데이터 건수
global.update_totalCount = 0; //수집 데이터 대상 신규 데이터 건수
global.change_totalCount = 0; //수집 데이터 대상 현재 페이지
global.change_endNumber = 0; //최대 페이지 수
global.start_date = ''; //시작일
global.end_date = ''; //종료일
const WANT_DAY = 3;

let task = cron.schedule(
	'0 * * * *',
	function () {
		scheduler_communityRecommand();
		console.log('스케줄러 - 커뮤니티 추천 게시물 : 매시간 정시에 실행 (3일 동안의 활동 기간 중 발췌');
	},
	{
		scheduled: false,
	},
);

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
async function checkShelterExist(data, sidoData) {
	let result = {};
	let phone_number = data.careTel.replace(/[-"]/gi, '');

	//보호소 계정확인
	result = await User.model.findOne({user_nickname: data.careNm, user_phone_number: phone_number}).where('user_is_delete').ne(true).exec();
	//계정이 없다면 새로 계정 생성한다.
	if (!result) {
		let shelter_address = {};
		shelter_address.brief = await checkAddress(data.careAddr);
		shelter_address.detail = data.careNm;
		shelter_address.city = sidoData;
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
			user_is_public_data: true,
		});
		result = await shelter.save();

		//신규로 등록된 보호소 정보를 수집 컬렉션에 insert 한다.
		let qeury = await Publicdatabyscheduler.makeNewdoc({
			process_date: new Date(),
			type: 'new_shelter',
			target_collection: 'userobjects',
			target_id: result._id,
		});
		result_shelter = await qeury.save();
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
		protect_animal_rescue_date: new Date(await dateFormatForDB(happenDt)),
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

	//수집 컬렉션에 insert 한다.
	let qeury_ShelterAnimal = await Publicdatabyscheduler.makeNewdoc({
		process_date: new Date(),
		noticeNo: noticeNo,
		type: 'new_shelter',
		target_collection: 'shelterprotectanimalobjects',
		target_id: protectAnimal_result._id,
		old_status: processState.animal,
	});
	await qeury_ShelterAnimal.save();

	const protectRequest = await ProtectRequest.makeNewdoc({
		protect_request_title: data.specialMark,
		protect_request_content: data.specialMark + '\n색:' + colorCd,
		protect_request_writer_id: userobject_id,
		protect_animal_species: kindCd.species,
		protect_animal_species_detail: kindCd.species_detail,
		protect_request_photos_uri: popfile,
		protect_request_photo_thumbnail: data.popfile,
		protect_request_date: new Date(await dateFormatForDB(happenDt)),
		protect_request_notice_sdt: new Date(await dateFormatForDB(data.noticeSdt)),
		protect_request_notice_edt: new Date(await dateFormatForDB(data.noticeEdt)),
		protect_desertion_no: desertionNo,
		protect_animal_noticeNo: noticeNo,
		protect_request_status: processState.status,
	});
	protectRequest.protect_animal_id = {...protectAnimal};
	protectRequest_result = await protectRequest.save();

	//수집 컬렉션에 insert 한다.
	let qeury_ProtectRequest = await Publicdatabyscheduler.makeNewdoc({
		process_date: new Date(),
		noticeNo: noticeNo,
		type: 'new_request',
		target_collection: 'protectrequestobjects',
		target_id: protectRequest_result._id,
		old_status: processState.status,
	});
	await qeury_ProtectRequest.save();
}

async function insertPetDataIntoDB(petDataItems) {
	let data = petDataItems.item;
	let dataLength = petDataItems.item.length;

	for (let i = 0; i < dataLength; i++) {
		//보호소 계정 생성 확인(없을 경우 생성)
		//보호소 존재 여부 확인 후 useronbject_id를 가져 옴.
		userobject_id = await checkShelterExist(data[i]);

		//유기번호가 ProtectRequestObject에 존재하지 않을 경우 makeDocAndInsertDB 함수 진행, 존재할 경우 보호 상태 업데이트 진행
		// protectRequestInfo = await ProtectRequest.model.findOne({protect_desertion_no: data[i].desertionNo}).exec();

		//공고번호가 ProtectRequestObject에 존재하지 않을 경우 makeDocAndInsertDB 함수 진행, 존재할 경우 보호 상태 업데이트 진행
		protectRequestInfo = await ProtectRequest.model.findOne({protect_animal_noticeNo: data[i].noticeNo}).exec();

		if (!protectRequestInfo) {
			insert_totalCount++;
			//ShelterAnimal 컬렉션과 ProtectRequest 컬렉션에 데이터 insert 진행
			await makeDocAndInsertDB(data[i], userobject_id);
		} else {
			let changedValue = await parseDataForDB('checkProcessState', protectRequestInfo.protect_request_status);

			//값이 다를 경우 상태 업데이트
			if (changedValue.status != data[i].processState) {
				update_totalCount++;
				console.log('------------------------------------------------------');
				console.log('changedValue.status =>', changedValue.status);
				console.log('data[i].processState =>', data[i].processState);

				//공공데이터포털 값을 코드값으로 변경
				shelterAnimalInfo = await ShelterAnimal.model.findById(protectRequestInfo.protect_animal_id).exec();
				let protect_animal_status = await parseDataForDB('processState', data[i].processState);

				{
					//수집 컬렉션에 insert 한다.
					let qeury_ShelterAnimal = await Publicdatabyscheduler.makeNewdoc({
						process_date: new Date(),
						type: 'update_shelteranimal',
						target_collection: 'shelterprotectanimalobjects',
						target_id: shelterAnimalInfo._id,
						old_status: shelterAnimalInfo.protect_animal_status,
						new_status: protect_animal_status.animal,
					});
					await qeury_ShelterAnimal.save();
				}

				//보호소의 보호중인 동물의 상태 업데이트
				shelterAnimalInfo.protect_animal_status = protect_animal_status.animal;
				console.log('shelterAnimalInfo.id =>', shelterAnimalInfo._id);
				console.log('shelterAnimalInfo.protect_animal_status =>', shelterAnimalInfo.protect_animal_status);
				await shelterAnimalInfo.save();

				//공공데이터포털 값을 코드값으로 변경
				let protect_request_status = await parseDataForDB('processState', data[i].processState);

				{
					//수집 컬렉션에 insert 한다.
					let qeury_ProtectRequest = await Publicdatabyscheduler.makeNewdoc({
						process_date: new Date(),
						type: 'update_request',
						target_collection: 'protectrequestobjects',
						target_id: protectRequestInfo._id,
						old_status: protectRequestInfo.protect_request_status,
						new_status: protect_request_status.status,
					});
					await qeury_ProtectRequest.save();
				}

				//보호 요청글 상태 업데이트
				protectRequestInfo.protect_request_status = protect_request_status.status;
				console.log('protectRequestInfo_.id =>', protectRequestInfo._id);
				console.log('protectRequestInfo.protect_request_status =>', protectRequestInfo.protect_request_status);
				await protectRequestInfo.save();
			}
		}
	}
	change_totalCount++;
	console.log('상태 업데이트된 count------------', update_totalCount);
	console.log('insert 된 데이터 count------------', insert_totalCount);
	console.log('현재 페이지------------', change_totalCount);

	//수집 컬렉션에 insert 한다.
	let statistics = await Publicdatabyscheduler.makeNewdoc({
		process_date: new Date(),
		sdate: start_date,
		edate: end_date,
		type: 'report',
		totalCount_on_date: crolling_totalCount,
		count_new_data: insert_totalCount,
		count_update_data: update_totalCount,
	});
	await statistics.save();

	if (change_endNumber == change_totalCount) {
		console.log('최대 페이지------------', change_endNumber);
		console.log('crolling_totalCount------------', crolling_totalCount);
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

//크롤링 해오기 위한 파라미터 값 셋팅
async function settingDataForApi(bgnde, endde, pageNo) {
	//공공데이터 포털 가입 후 서비스키 값을 받도록 한다.
	let params = 'ServiceKey=lw1RRanlp%2B6KTO2qlo2i2D0VYissKd4QEm8OhB%2FKAnxcgiwkKNmk%2BzQlUuSBwFmmQYw1dIZNUlSmF7ws0oUUXQ%3D%3D';
	//시작날짜
	params += '&bgnde=' + bgnde;
	//종료날짜
	params += '&endde=' + endde;
	//무조건 1000으로 맞춘다 - 그래야 페이징 처리가 편하다.
	params += '&numOfRows=1000';
	//페이지 번호
	params += '&pageNo=' + pageNo;
	//데이터 타입은 json을 쓰도록 한다.
	params += '&_type=json';

	let options = {
		method: 'GET', // POST method
		rejectUnauthorized: false,
		url: 'https://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic?' + params,
		headers: {Cookie: 'application/json'},
	};

	let qeury = await Publicdatabyscheduler.makeNewdoc({
		process_date: new Date(),
		sdate: bgnde,
		edate: endde,
		type: 'report',
		url: options.url,
	});
	await qeury.save();

	return options;
}

async function accessOpenApi(options) {
	let petDataArray;
	let info;
	console.log('accessOpenApi---진입');
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

//공공데이터 포털 보호요청 게시물 크롤링 해오기
router.post('/getProtectRequestFromPublicData', (req, res) => {
	controller(req, res, async () => {
		let bgnde = req.body.bgnde;
		start_date = '';
		end_date = '';
		insert_totalCount = 0;
		update_totalCount = 0;
		change_totalCount = 0;
		change_endNumber = 1;
		crolling_totalCount = 0;
		if (req.body.endde == undefined) {
			req.body.endde = '';
		}
		let endde = req.body.endde;
		let pageNo = 1;
		start_date = bgnde;
		end_date = endde;

		//openapi 설정값 셋팅
		options = await settingDataForApi(bgnde, endde, pageNo);

		console.log('options=>', options);

		//크롤링 진행
		let totalCount = await accessOpenApi(options);
		crolling_totalCount = totalCount;
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

//공공데이터 삭제 ShelterAnimal, ProtectRequest 컬렉션 크롤링 데이터 모두 삭제
router.post('/deletePublicData', (req, res) => {
	controller(req, res, async () => {
		await ShelterAnimal.model.deleteMany({protect_desertion_no: {$exists: true}}).lean();
		await ShelterAnimal.model.deleteMany({protect_animal_photo_uri_list: {$regex: 'animal.go.kr'}}).lean();
		await ProtectRequest.model.deleteMany({protect_desertion_no: {$exists: true}}).lean();
		res.json({status: 200, msg: '--'});
	});
});

router.post('/deleteShelterInfo', (req, res) => {
	controller(req, res, async () => {
		await User.model
			.deleteMany({
				user_profile_uri: 'https://pinetreegy.s3.ap-northeast-2.amazonaws.com/upload/1652351934385_6346cd21-25e7-4fa3-be06-ec7ddd85c880.jpg',
			})
			.lean();
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
				console.log('body==>', body);
				info = JSON.parse(body);
				petDataArray = info.response.body.items;
				resolve(petDataArray);
			}
		});
	});
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

//공공데이터 보호소 정보 가져오기
router.post('/getPublicShelterData', (req, res) => {
	controller(req, res, async () => {
		let paramsList;
		let sidoUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/sido?';

		for (let z = 1; z <= 2; z++) {
			let sidoDataList;
			paramsList = '';
			paramsList = '&pageNo=' + [z];
			let options = await settingSidoForApi(sidoUrl, paramsList);
			console.log('options=>', options);
			try {
				sidoDataList = await accessForShelterOpenApi(options);
			} catch (error) {
				console.log('error=>', error);
				//에러 발생시 2초 후에 재접속해서 가져온다. (대부분 에러는 재접속시 해결됨.)
				z--;
				await sleep(2000);
				continue;
			}
			let sigunguUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/sigungu?';

			await sleep(200);
			if (sidoDataList.item) {
				let sigunguDataList;
				for (let i = 0; i < sidoDataList.item.length; i++) {
					paramsList = '';
					paramsList = '&upr_cd=' + sidoDataList.item[i].orgCd;
					options = await settingSidoForApi(sigunguUrl, paramsList);
					console.log('options=>', options);
					try {
						sigunguDataList = await accessForShelterOpenApi(options);
					} catch (error) {
						console.log('error=>', error);
						//에러 발생시 2초 후에 재접속해서 가져온다. (대부분 에러는 재접속시 해결됨.)
						i--;
						await sleep(2000);
						continue;
					}
					await sleep(200);
					if (sigunguDataList.item) {
						let shelterDataList;
						for (let j = 0; j < sigunguDataList.item.length; j++) {
							paramsList = '';
							let shelterUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/shelter?';
							paramsList = '&upr_cd=' + sigunguDataList.item[j].uprCd;
							paramsList += '&org_cd=' + sigunguDataList.item[j].orgCd;
							options = await settingSidoForApi(shelterUrl, paramsList);
							console.log('options=>', options);
							try {
								shelterDataList = await accessForShelterOpenApi(options);
							} catch (error) {
								console.log('error=>', error);
								//에러 발생시 2초 후에 재접속해서 가져온다. (대부분 에러는 재접속시 해결됨.)
								j--;
								await sleep(2000);
								continue;
							}
							await sleep(200);

							if (shelterDataList.item) {
								let abandonmentPublicDataList;
								for (let k = 0; k < shelterDataList.item.length; k++) {
									paramsList = '';
									let abandonmentPublicUrl = 'http://apis.data.go.kr/1543061/abandonmentPublicSrvc/abandonmentPublic?';
									paramsList = '&care_reg_no=' + shelterDataList.item[k].careRegNo;
									options = await settingSidoForApi(abandonmentPublicUrl, paramsList);
									console.log('options=>', options);
									try {
										abandonmentPublicDataList = await accessForShelterOpenApi(options);
									} catch (error) {
										console.log('error=>', error);
										//에러 발생시 2초 후에 재접속해서 가져온다. (대부분 에러는 재접속시 해결됨.)
										k--;
										await sleep(2000);
										continue;
									}

									if (abandonmentPublicDataList.item) {
										let shlterDetaildata = abandonmentPublicDataList.item[0];
										checkShelterExist(shlterDetaildata, sidoDataList.item[i].orgdownNm);
									}
									await sleep(200);
								}
							}
						}
					}
				}
			}
		}
		res.json({status: 200, msg: '--'});
	});
});

//커뮤니티 리뷰 추천 게시물 계산 함수
async function scheduler_communityRecommand() {
	//현재 날짜와 기간설정 날짜 계산
	let now = new Date();
	let result_wantday = new Date(now.setDate(now.getDate() - WANT_DAY));
	result_wantday_format = new Date(+result_wantday + 3240 * 10000).toISOString().split('T')[0];
	let dateType = new Date(result_wantday_format);

	let dateList = await Community.model
		.find({
			community_date: {
				$gte: new Date(dateType),
			},
			community_type: 'review',
		})
		.where('community_is_delete')
		.ne(true)
		.populate('community_writer_id')
		.exec();

	let listCheckedNull = Array();

	//기존 추천 게시물 상태값 삭제
	await Community.model
		.find({community_is_recomment: true}, {community_type: 'review'})
		.updateMany({$set: {community_is_recomment: false}})
		.lean();

	if (dateList.length > 0) {
		dateList = dateList.map(dateList => {
			if (dateList.community_writer_id != null) {
				listCheckedNull.push(dateList._doc);
			}
		});

		dateList = Array();
		dateList = [...listCheckedNull];

		let max = 0;
		let max_community_id;
		let max_second = 0;
		let max_second_community_id;

		for (let i = 0; i < dateList.length; i++) {
			//설정한 기간내의 데이터들 중에 좋아요, 즐겨찾기, 댓글수를 합한 종합 점수 설정
			like_count = dateList[i].community_like_count;
			favorite_count = dateList[i].community_favorite_count;
			comment_count = dateList[i].community_comment_count;
			total = like_count + favorite_count + comment_count;

			//최대값과 두번째 최대값 구하기
			if (total > max) {
				max_second = max;
				max = total;
				max_second_community_id = max_community_id;
				max_community_id = dateList[i]._id;
			} else if (total > max_second) {
				max_second = total;
				max_second_community_id = dateList[i]._id;
			}
		}

		//최대값과 두번째 최대값이 존재 할 경우 둘다 등록한다.
		if (max > 0 && max_second > 0) {
			//최대값과 두번째 최대값 추천 게시물로 등록
			await Community.model
				.find({_id: {$in: [max_community_id, max_second_community_id]}})
				.updateMany({$set: {community_is_recomment: true}})
				.lean();
		}
		//최대값만 존재 할 경우 - 나머지 한개는 랜덤으로 한개 추가해야 함.
		else if (max > 0) {
			//최대값 추천 게시물로 등록
			await Community.model.findOneAndUpdate({_id: max_community_id}, {$set: {community_is_recomment: true}}).lean();

			//랜덤으로 추가하기 위한 절차 (추천게시물로 등록된 최대값을 가진 게시물을 제외하는 과정)
			let tempArray = Array();
			for (let i = 0; i < dateList.length; i++) {
				if (!dateList[i]._id.equals(max_community_id)) {
					tempArray.push(dateList[i]._id);
				}
			}
			//랜덤으로 데이터 설정 및 DB 업데이트
			let selectIndex = Math.floor(Math.random() * (tempArray.length - 0)) + 0;
			await Community.model
				.find({_id: {$in: [max_community_id, tempArray[selectIndex]]}})
				.updateMany({$set: {community_is_recomment: true}})
				.lean();
		}
		//최대값이 존재 하지 않을 경우 (글쓴이 외 다른 사용자들의 활동이 없을 경우)
		else {
			let selectIndex1 = Math.floor(Math.random() * (dateList.length - 0)) + 0;
			for (let i = 0; i < 10000; i++) {
				selectIndex2 = Math.floor(Math.random() * (dateList.length - 0)) + 0;
				if (selectIndex1 == selectIndex2) continue;
				else break;
			}
			//랜덤으로 설정한 두 게시물을 추천 게시물로 등록
			await Community.model
				.find({_id: {$in: [dateList[selectIndex1]._id, dateList[selectIndex2]._id]}})
				.updateMany({$set: {community_is_recomment: true}})
				.lean();
		}

		let resultRecommand = await Community.model.find({community_is_recomment: true}, {community_type: 'review'}).lean();
	}
}

router.post('/startCommunityRecommand', (req, res) => {
	controller(req, res, async () => {
		let recommandTask = req.body.recommandTask;

		console.log('recommandTask->', recommandTask);

		if (recommandTask == 'true') {
			console.log('crontab true------');
			task.start();
		} else {
			console.log('crontab false------');
			task.stop();
		}

		res.json({status: 200, msg: '실행 =>' + recommandTask});
	});
});

module.exports = router;
