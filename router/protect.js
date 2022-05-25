const express = require('express');
const router = express.Router();
const User = require('../schema/user');
const Feed = require('../schema/feed');
const ShelterAnimal = require('../schema/shelterProtectAnimal');
const ProtectRequest = require('../schema/protectrequest');
const ProtectActivity = require('../schema/protectionActivityApplicant');
const VolunteerActivity = require('../schema/volunteerActivityApplicant');
const Notice = require('../schema/notice');
const NoticeUser = require('../schema/noticeuser');
const FavoriteEtc = require('../schema/favoriteetc');
const uploadS3 = require('../common/uploadS3');
const {controller, controllerLoggedIn} = require('./controller');
const {
	USER_NOT_VALID_TYPE,
	ALERT_NO_RESULT,
	LOGOUT_FAILED,
	LOGOUT_SUCCESS,
	ALERT_DUPLICATE_NICKNAME,
	ALERT_NOT_VALID_USEROBJECT_ID,
	USER_NOT_FOUND,
	ALERT_NOT_VALID_TARGER_OBJECT_ID,
	REQUEST_PARAMETER_NOT_VALID,
} = require('./constants');
const mongoose = require('mongoose');

//유저의 보호동물(프로필에서 보여지는) 목록 조회
router.post('/getUserProtectAnimalList', (req, res) => {
	controller(req, res, async () => {
		let user = await User.model.findById(req.body.userobject_id).exec();
		if (user.user_type != 'user') {
			res.json({status: 400, msg: USER_NOT_VALID_TYPE});
			return;
		}

		user = await User.model
			.findById(req.body.userobject_id)
			.populate({path: 'user_my_pets' /*,select:'user_type user_nickname user_profile_uri pet_status'*/, match: {pet_status: 'protect'}})
			.exec();

		if (user.user_my_pets.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: user.user_my_pets});
	});
});

//동물보호(입양, 임시보호) 신청
router.post('/createProtectActivity', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let newActivity = await ProtectActivity.makeNewdoc({
			protect_act_applicant_id: req.session.loginUser, //일반유저만 받는지?
			protect_act_request_article_id: req.body.protect_request_object_id,
			protect_act_address: typeof req.body.protect_act_address == 'string' ? JSON.parse(req.body.protect_act_address) : req.body.protect_act_address,
			protect_act_checklist:
				typeof req.body.protect_act_checklist == 'string' ? JSON.parse(req.body.protect_act_checklist) : req.body.protect_act_checklist,
			protect_act_companion_history:
				typeof req.body.protect_act_companion_history == 'string'
					? JSON.parse('[' + req.body.protect_act_companion_history + ']')
					: req.body.protect_act_companion_history,
			protect_act_motivation: req.body.protect_act_motivation,
			protect_act_phone_number: req.body.protect_act_phone_number,
			protect_act_type: req.body.protect_act_type,
		});

		let requestArticle = await ProtectRequest.model.findById(newActivity.protect_act_request_article_id).exec();
		if (!requestArticle) {
			res.json({status: 404, msg: ALERT_NOT_VALID_TARGER_OBJECT_ID});
			return;
		}

		newActivity.protect_act_request_shelter_id = requestArticle.protect_request_writer_id;
		newActivity.protect_act_protect_animal_id = requestArticle.protect_animal_id;
		await newActivity.save();

		let animal = await ShelterAnimal.model.findById(newActivity.protect_act_protect_animal_id).exec();

		animal.protect_act_applicants.push(newActivity._id);
		await animal.save();

		res.json({status: 200, msg: newActivity});
	});
});

/**
 * 유저의 동물보호 신청내역 가져오기
 * (입양신청, 임시보호 신청, 봉사활동 신청 - 한 화면에서 입양신청 1개, 임시보호 신청 1개, 봉사활동 신청 3 ~ 4개 표출)
 * 로그인을 하여야 신청내역을 볼수있음.(입력 파라메터 없음)
 * 최신 게시물 가져오기, 하나만 가져오기 등의 필터등은 추후 개선이 필요해 보임.
 */
router.post('/getAppliesRecord', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let volunteer_number = 4;
		let applies = await ProtectActivity.model
			.find({protect_act_applicant_id: req.session.loginUser})
			.populate({path: 'protect_act_request_article_id', populate: 'protect_request_writer_id'})
			.sort('-_id')
			.exec();

		//봉사활동 신청만 있을 경우에도 표출되어야 하므로 return 시키지 않고 진행
		// if (applies.length < 1) {
		// 	res.json({status: 404, msg: ALERT_NO_RESULT});
		// 	return;
		// }

		let volunteerActivityList = await VolunteerActivity.model
			.find({
				// volunteer_accompany: {$elemMatch: {$eq: req.session.loginUser}},
				volunteer_accompany: {$elemMatch: {member: req.session.loginUser}},
			})
			.populate('volunteer_target_shelter')
			.populate('volunteer_accompany.member')
			.sort('-_id')
			.limit(volunteer_number)
			.exec();

		res.json({
			status: 200,
			msg: {
				adopt: applies.filter(v => v.protect_act_type == 'adopt')[0],
				protect: applies.filter(v => v.protect_act_type == 'protect')[0],
				volunteer: volunteerActivityList, //봉사활동 부분 추가해야함
			},
		});
	});
});

/**
 * 유저의 보호활동(입양,임시보호) 신청 내역을 가져오기
 *
 *
 */
router.post('/getUserAdoptProtectionList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let applies = await ProtectActivity.model
			.find({protect_act_applicant_id: req.session.loginUser, protect_act_type: req.body.protect_act_type})
			.sort('-_id')
			.populate({path: 'protect_act_request_article_id', populate: 'protect_request_writer_id'})
			.limit(req.body.request_number)
			.exec();
		if (applies.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({
			status: 200,
			msg: applies,
		});
	});
});

/**
 * 신청서 자세히 보기
 *
 */
router.post('/getApplyDetailById', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let applyDetail = await ProtectActivity.model
			.findById(req.body.protect_act_object_id)
			.populate('protect_act_request_shelter_id', 'user_nickname')
			.populate('protect_act_request_article_id')
			.sort('-_id')
			.exec();

		if (!applyDetail) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		protect_act_request_article_id = applyDetail.protect_act_request_article_id._id;

		protectActivityList = await ProtectActivity.model.find({protect_act_request_article_id: protect_act_request_article_id});
		let approved_applicant_id;
		for (let i = 0; i < protectActivityList.length; i++) {
			if (protectActivityList[i].protect_act_status == 'accept') {
				approved_applicant_id = protectActivityList[i].protect_act_applicant_id;
				break;
			}
		}

		//_doc외에 불필요한 정보가 출력되어 .doc 내용만 출력
		const result = {
			...applyDetail._doc,
			approved_applicant: approved_applicant_id,
		};

		res.json({
			status: 200,
			msg: result,
		});
	});
});

/**
 * 보호활동 신청서의 상태를 변경
 */
router.post('/setProtectActivityStatus', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let protectActivity = await ProtectActivity.model.findById(req.body.protect_act_object_id).exec(); //요청
		if (!protectActivity) {
			res.json({status: 404, msg: '요청한 ID와 일치하는 신청서가 존재하지 않습니다.'});
			return;
		}

		// let protectRequest = await ProtectRequest.model.findById(protectActivity.protect_act_request_article_id).exec();
		// if(!protectRequest){
		// 	res.json({status: 404, msg: '요청한 신청서에 적절한 동물보호 요청이 없습니다. 데이터베이스를 체크해주세요'});
		// 	return;
		// }

		const userType = req.session.user_type;
		const statusList = ['accept', 'denied', 'cancel', 'wait', 'done'];
		const targetStatus = req.body.protect_act_status; //요청

		if (!statusList.some(v => v == targetStatus)) {
			res.json({status: 400, msg: REQUEST_PARAMETER_NOT_VALID});
			return;
		}

		if (userType == 'user' && ['denied', 'accept'].some(v => v == targetStatus)) {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다.'});
			return;
		}

		if (userType == 'shelter' && targetStatus == 'cancel') {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다.'});
			return;
		}

		//해당 신청서만 accept로 변경
		protectActivity.protect_act_status = targetStatus;
		await protectActivity.save();

		let applicant_user_id = protectActivity.protect_act_applicant_id;
		let approved_applicant = applicant_user_id;
		let message = '';
		switch (targetStatus) {
			case 'accept':
				message = '승인';
				break;
			case 'denied':
				message = '거절(보호소)';
				break;
			case 'cancel':
				message = '취소(사용자)';
				break;
			case 'done':
				message = '완료';
				break;
		}

		//알림 내역에 보호활동 관련 insert
		let checkNotice = await Notice.model.findOne({notice_user_id: applicant_user_id});
		if (checkNotice.notice_my_applicant != null && checkNotice.notice_my_applicant) {
			let noticeUser = NoticeUser.makeNewdoc({
				notice_user_receive_id: applicant_user_id,
				notice_user_related_id: req.session.loginUser,
				notice_user_contents_kor: '보호 활동 신청이 ' + message + '(으)로 변경되었습니다.',
				target_object: req.body.protect_act_object_id,
				target_object_type: ProtectActivity.model.modelName,
				notice_approved_applicant: approved_applicant,
				notice_user_date: Date.now(),
			});
			let resultNoticeUser = await noticeUser.save();
			let user = await User.model
				.findOneAndUpdate({_id: applicant_user_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
				.lean();
		}

		let protect_act_request_article_id = JSON.stringify(protectActivity.protect_act_request_article_id).replace(/\"/g, '');

		//상태 알림을 하기 위해 다른 신청자들의 리스트를 가져옴.
		let protectActivity_others_list = await ProtectActivity.model
			.find({protect_act_request_article_id: protect_act_request_article_id})
			.where('protect_act_status')
			.ne('accept')
			.lean();

		//해당 동물 보호 게시글에 신청한 다른 신청자들의 신청서 컬렉션에 protect_act_status가 완료로 변경
		let protectActivity_others = await ProtectActivity.model
			.find({protect_act_request_article_id: protect_act_request_article_id})
			.where('protect_act_status')
			.ne('accept')
			.updateMany({$set: {protect_act_status: 'done'}})
			.exec();

		//알림 내역에 보호활동 관련 insert
		for (let i = 0; i < protectActivity_others_list.length; i++) {
			applicant_user_id = protectActivity_others_list[i].protect_act_applicant_id;
			let checkNotice = await Notice.model.findOne({notice_user_id: protectActivity_others_list[i].protect_act_applicant_id});
			if (checkNotice.notice_my_applicant != null && checkNotice.notice_my_applicant) {
				let noticeUser = NoticeUser.makeNewdoc({
					notice_user_receive_id: applicant_user_id,
					notice_user_related_id: req.session.loginUser,
					notice_user_contents_kor: '보호 활동 신청이 ' + '완료(으)로 변경되었습니다.',
					target_object: req.body.protect_act_object_id,
					target_object_type: ProtectActivity.model.modelName,
					notice_approved_applicant: approved_applicant,
					notice_user_date: Date.now(),
				});
				let resultNoticeUser = await noticeUser.save();
				let user = await User.model
					.findOneAndUpdate({_id: applicant_user_id}, {$set: {user_alarm: true}}, {new: true, upsert: true, setDefaultsOnInsert: true})
					.lean();
			}
		}

		//다른 신청서에 대한 결과값 확인시 아래 주석들을 풀어서 확인할 것!
		// console.log('protectActivity_others after ==>', protectActivity_others);
		// let protectActivity_others_end = await ProtectActivity.model
		// 	.find({protect_act_request_article_id: protect_act_request_article_id})
		// 	.where('protect_act_status')
		// 	.exec();
		// console.log('protectActivity_others_end ==>', protectActivity_others_end);

		res.json({status: 200, msg: protectActivity});
	});
});

/**
 * 동물보호요청 게시물의 상태를 변경
 */
router.post('/setProtectRequestStatus', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		let protectRequest = await ProtectRequest.model.findById(req.body.protect_request_object_id).exec(); //요청
		if (!protectRequest) {
			res.json({status: 404, msg: '요청한 ID와 일치하는 동물보호 요청 게시물이 존재하지 않습니다.'});
			return;
		}

		// let viewer = await User.model.findById(req.session.loginUser).exec();

		// const userType = viewer.user_type;
		const userType = req.session.user_type;
		const statusList = ['rescue', 'discuss', 'rainbowbridge', 'complete'];
		const targetStatus = req.body.protect_request_status; //요청

		if (!statusList.some(v => v == targetStatus)) {
			res.json({status: 400, msg: REQUEST_PARAMETER_NOT_VALID});
			return;
		}

		if (userType == 'user') {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다. 보호소 계정으로 로그인하세요'});
			return;
		}

		// if (userType == 'shelter' && targetStatus == 'cancel') {
		// 	res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다.'});
		// 	return;
		// }

		protectRequest.protect_request_status = targetStatus;
		await protectRequest.save();

		res.json({status: 200, msg: protectRequest});
	});
});

/**
 * 대상 동물보호 게시물에 동물보호를 신청한 신청자의 리스트
 */
router.post('/getProtectApplicantList', (req, res) => {
	controllerLoggedIn(req, res, async () => {
		const userType = req.session.user_type;

		if (userType == 'user') {
			res.json({status: 400, msg: '해당 유저 타입에는 허가되지 않은 요청입니다. 보호소 계정으로 로그인하세요'});
			return;
		}

		let filterObj = {protect_act_request_article_id: req.body.protect_request_object_id}; //요청
		let status = req.body.protect_request_status;
		let statusList = ['rescue', 'discuss', 'nearrainbow', 'complete'];
		if (status && statusList.some(v => v == status)) {
			filterObj = {...filterObj, protect_request_status: status}; //요청
		}
		if (!statusList.some(v => v == status)) {
			res.json({status: 400, msg: '허가되지 않은 상태 요청입니다.'});
			return;
		}

		let protectApplicants = await ProtectActivity.model.find(filterObj).populate('protect_act_applicant_id').exec();
		if (protectApplicants.length < 1) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		res.json({status: 200, msg: protectApplicants});
	});
});

/**
 * 동물보호 요청 게시글 상세조회
 */
router.post('/getProtectRequestByProtectRequestId', (req, res) => {
	controller(req, res, async () => {
		let protectRequest = await ProtectRequest.model.findById(req.body.protect_request_object_id).populate('protect_request_writer_id').lean();
		if (!protectRequest) {
			res.json({status: 404, msg: ALERT_NO_RESULT});
			return;
		}

		let favoritedProtectRequest = [];
		if (req.session.loginUser) {
			favoritedProtectRequest = await FavoriteEtc.model.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false}).lean();
			if (
				favoritedProtectRequest.find(
					favoritedProtectRequest => favoritedProtectRequest.favorite_etc_target_object_id == protectRequest.protect_request_writer_id._id,
				)
			) {
				protectRequest.protect_request_writer_id.is_favorite = true;
			} else {
				protectRequest.protect_request_writer_id.is_favorite = false;
			}
			if (favoritedProtectRequest.find(favoritedProtectRequest => favoritedProtectRequest.favorite_etc_target_object_id == protectRequest._id)) {
				protectRequest.protect_request_is_favorite = true;
			} else {
				protectRequest.protect_request_is_favorite = false;
			}
		}
		res.json({status: 200, msg: protectRequest});
	});
});

/**
 * 지역에 따른 보호소 정보
 */
router.post('/getShelterInfo', (req, res) => {
	controller(req, res, async () => {
		let shelterInfoList;
		if (req.body.city == 'all') {
			shelterInfoList = await User.model.find({user_type: 'shelter'}).lean();
		} else {
			shelterInfoList = await User.model.find({'shelter_address.city': {$regex: req.body.city}, user_type: 'shelter'}).lean();
		}
		res.json({
			status: 200,
			msg: shelterInfoList,
		});
	});
});

async function dateFormatForBetween(str) {
	let year = str.substr(0, 4);
	let month = str.substr(4, 2);
	let day = str.substr(6);
	return year + '-' + month + '-' + day;
}

async function addressMaching(adressData) {
	switch (adressData) {
		case '충청북도':
		case '충청남도':
		case '전라북도':
		case '전라남도':
		case '경상남도':
		case '경상북도':
			return adressData.substring(0, 1) + adressData.substring(2, 3);
		case '세종특별자치시':
		case '제주특별자치도':
			return adressData.substring(0, 2);
		default:
			return adressData;
	}
}

async function compareAnimalList(dataList) {
	let animalList1 = ['개', '그 외'];
	let animalList2 = ['고양이', '그 외'];
	let animalList3 = ['그 외'];

	if ((dataList.filter(x => !animalList1.includes(x)).concat(animalList1.filter(x => !dataList.includes(x))).length = 0)) {
		return {$ne: '고양이'};
	} else if ((dataList.filter(x => !animalList2.includes(x)).concat(animalList2.filter(x => !dataList.includes(x))).length = 0)) {
		return {$ne: '개'};
	} else if ((dataList.filter(x => !animalList3.includes(x)).concat(animalList3.filter(x => !dataList.includes(x))).length = 0)) {
		return {$and: [{$ne: '개'}, {$ne: '고양이'}]};
	}
}

/**
 * 보호요청 필터 검색
 */
router.post('/getSearchResultProtectRequest', (req, res) => {
	controller(req, res, async () => {
		const page = parseInt(req.body.page) * 1 || 1;
		const limit = parseInt(req.body.limit) * 1 || 30;
		const skip = (page - 1) * limit;

		let query = {};
		let send_query = {};
		let result;

		for (let filed in req.body) {
			req.body[filed] !== '' ? (query[filed] = req.body[filed]) : null;
		}

		let notice_sdt = query.protect_request_notice_sdt;
		let notice_edt = query.protect_request_notice_edt;
		let date_notice_sdt = new Date(await dateFormatForBetween(notice_sdt));
		let date_notice_edt = new Date(await dateFormatForBetween(notice_edt));

		send_query['protect_request_date'] = {$gte: date_notice_sdt, $lte: date_notice_edt};

		//공고번호를 지역 필터로 사용
		if (query.city != undefined) {
			cityName = await addressMaching(query.city);
			send_query['protect_animal_noticeNo'] = {$regex: cityName};
		}

		//보호소 필터
		if (query.shelter_object_id_list != undefined) {
			let changedType_object_id = Array();
			let shelter_object_id_list =
				typeof req.body.shelter_object_id_list == 'string'
					? req.body.shelter_object_id_list.replace(/[\[\]\"]/g, '').split(',')
					: req.body.shelter_object_id_list;
			for (let p = 0; p < shelter_object_id_list.length; p++) {
				changedType_object_id.push(mongoose.Types.ObjectId(shelter_object_id_list[p]));
			}
			send_query['protect_animal_id.protect_animal_belonged_shelter_id'] = {$in: changedType_object_id};
		}

		//동물 종류 필터
		if (query.protect_animal_species != undefined) {
			let protect_animal_species =
				typeof req.body.protect_animal_species == 'string'
					? req.body.protect_animal_species.replace(/[\[\]\"]/g, '').split(',')
					: req.body.protect_animal_species;

			if (protect_animal_species.length == 1 && protect_animal_species[0] != '그 외') {
				send_query['protect_animal_species'] = protect_animal_species[0];
			} else if (protect_animal_species.length == 2 && protect_animal_species.filter(x => !['개', '그 외'].includes(x)).length == 0) {
				send_query['protect_animal_species'] = {$ne: '고양이'};
			} else if (protect_animal_species.length == 2 && protect_animal_species.filter(x => !['고양이', '그 외'].includes(x)).length == 0) {
				send_query['protect_animal_species'] = {$ne: '개'};
			} else if (protect_animal_species.length == 1 && protect_animal_species[0] == '그 외') {
				send_query['protect_animal_species'] = {$nin: ['개', '고양이']};
			} else if (protect_animal_species.length == 2 && protect_animal_species.filter(x => !['개', '고양이'].includes(x)).length == 0) {
				send_query['protect_animal_species'] = {$in: protect_animal_species};
			} else if (protect_animal_species.filter(x => !['개', '고양이', '그 외'].includes(x)).length == 0) {
			}
		}

		result = await ProtectRequest.model
			.find(send_query)
			.populate('protect_request_writer_id')
			.where('protect_request_is_delete')
			.ne(true)
			.skip(skip)
			.limit(limit)
			.sort('-_id')
			.lean();

		let favoritedList = [];
		if (req.session.loginUser) {
			favoritedList = await FavoriteEtc.model.find({favorite_etc_user_id: req.session.loginUser, favorite_etc_is_delete: false}).lean();

			result = result.map(result => {
				if (favoritedList.find(favorited => favorited.favorite_etc_target_object_id == result._id)) {
					return {...result, is_favorite: true};
				} else {
					return {...result, is_favorite: false};
				}
			});
		}

		let now = new Date(); // 오늘
		result = result.map(result => {
			if (result.protect_request_notice_edt != undefined) {
				let lastDay = result.protect_request_notice_edt.getDate();
				var difference = now.getDate() - lastDay;
				return {...result, notice_day: difference};
			} else return {...result};
		});

		res.json({
			status: 200,
			msg: result,
		});
	});
});

module.exports = router;
