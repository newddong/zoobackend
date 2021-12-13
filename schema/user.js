const mongoose = require('mongoose');
const Schema = mongoose.Schema;

/** 동의사항 */
const UserAgreement = {
	/** @type {boolean} 14세 이상 */
	is_over_fourteen: {type: Boolean, default: false},
	/** @type {boolean} 서비스 이용동의 */
	is_service: {type: Boolean, default: false},
	/** @type {boolean} 개인정보 제공동의 */
	is_personal_info: {type: Boolean, default: false},
	/** @type {boolean} 위치정보 제공동의 */
	is_location_service_info: {type: Boolean, default: false},
	/** @type {boolean} 기부정보 제공동의 */
	is_donation_info: {type: Boolean, default: false},
	/** @type {boolean} 메케팅 활용 동의 */
	is_marketting_info: {type: Boolean, default: false},
};

/** 유저 주소 */
const UserAddress = {
	/** @type {String} 시,도  */
	city: {type: String},

	/** @type {String} 군,구 */
	district: {type: String},

	/** @type {String} 동,읍,면 */
	neighbor: {type: String},

	/** @type {String} 검색주소 */
	brief: {type: String},

	/** @type {String} 검색주소(자세히) */
	detail: {type: String},
}; //회원주소

/** 관심사 항목 키워드 */
const UserInterest = {
	/** @type {String} 지역 관심사 */
	location: {type: String},
	/** @type {String} 활동 관심사 */
	activity: {type: String},
};

const ShelterAddress = {
	/** @type {String} 시,도  */
	city: {type: String},

	/** @type {String} 군,구 */
	district: {type: String},

	/** @type {String} 동,읍,면 */
	neighbor: {type: String},

	/** @type {String} 검색주소 */
	brief: {type: String},

	/** @type {String} 검색주소(자세히) */
	detail: {type: String},
};

/** 스키마 명세
 *
 */
const UserObject = {
	/** @type {'user'|'shelter'|'pet'} 유저 타입정보 '일반유저|보호소|반려동물'로 구분됨 */
	user_type: {type: String, default: 'user'},
	/** @type {UserAgreement} 가입시 동의사항 */
	user_agreement: UserAgreement,
	/** @type {string} 실명 */
	user_name: {type: String},
	/** @type {string} 닉네임 */
	user_nickname: {type: String},
	/** @type {string} 휴대폰번호 */
	user_phone_number: {type: String},
	/** @type { String} 가입된 통신사 */
	user_mobile_company: {type: String},

	/** @type { Boolean} 폰번호 인증여부 */
	user_is_verified_phone_number: {type: Boolean, default: false},

	/** @type { String} 이메일 */
	user_email: {type: String},

	/** @type { Boolean} 이메일 인증여부 */
	user_is_verified_email: {type: Boolean, default: false},

	/** @type { String} 패스워드 */
	user_password: {type: String},
	/** @type {UserAddress} */
	user_address: UserAddress,
	/** @type { String} 프로필 사진 */
	user_profile_uri: {type: String},

	/** @type { String} 프로필에 노출될 자기소개 */
	user_introduction: {type: String, default: ''},

	/** @type { String} 유저 생일, 마이메뉴-프로필 상세정보에서 수정 */
	user_birthday: {type: String},

	/** @type {'male'|'female'} 유저 성별, 마이메뉴-프로필 상세정보에서 수정 */
	user_sex: {type: String},

	/** @type {Array.<UserInterest>} 유저의 관심사, 마이메뉴-프로필 상세정보에서 수정 */
	user_interests: [UserInterest],

	/** @type { Number} 업로드 게시물 숫자 */
	user_upload_count: {type: Number, default: 0},

	/** @type { Number} 팔로우 숫자 */
	user_follow_count: {type: Number, default: 0},

	/** @type { Number} 팔로워 숫자 */
	user_follower_count: {type: Number, default: 0},

	/** @type { Boolean} 유저의 차단여부 */
	user_denied: {type: Boolean, default: false},

	/** @type { Date} 가입일 */
	user_register_date: {type: Date, default: Date.now},

	/** @type {Array.<String>} 내 반려동물들들 */
	user_my_pets: [{type: Schema.Types.ObjectId, ref: 'UserObject'}],

	/** @type {'private'|'public'} 보호소 유형, 공립(public), 사립(private)로 나뉨 */
	shelter_type: {type: String},

	/** @type { String} 보호소 이름 */
	shelter_name: {type: String},
	/** @type {ShelterAddress} 보호소 주소 */
	shelter_address: ShelterAddress,
	/** @type { String} 보호소 홈페이지 uri */
	shelter_homepage: {type: String},

	/** @type { String} 보호소 대표 전화번호, 휴대폰 번호 */
	shelter_delegate_contact_number: {type: String},

	/** @type { Date} 보호소 설립일 */
	shelter_foundation_date: {type: Date},

	/** @type { Boolean} 반려동물이 임시보호 중인지 여부 */
	pet_is_temp_protection: {type: Boolean},

	/** @type { String} 반려동물의 종류(ex 개, 고양이, 토끼 등) */
	pet_species: {type: String},

	/** @type { String} 반려동물의 종류(ex 리트리버, 불독, 진돗개 등) */
	pet_species_detail: {type: String},

	/** @type { 'male'|'female'|'unknown'} 반려동물의 성별 */
	pet_sex: {type: String},

	/** @type {'yes'|'no'|'unknown'} 반려동물 중성화 여부 */
	pet_neutralization: {type: String},

	/** @type { Date} 반려동물 생일 */
	pet_birthday: {type: Date},

	/** @type { String} 반려동물 몸무게 */
	pet_weight: {type: String},

	/** @type {'protect'|'adopt'|'companion'} 반려동물의 상태, 임시보호중(protect), 입양됨(adopt), 반려동물(companion)  */
	pet_status: {type: String},

	/** @type {String } 반려동물 입양자 */
	pet_adopter: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type {String} 반려동물 임시보호자 */
	pet_protector: {type: Schema.Types.ObjectId, ref: 'UserObject'},

	/** @type {Array.<String>} 반려동물 가족계정 */
	pet_family: [{type: Schema.Types.ObjectId, ref: 'UserObject'}],
};

/** @type {mongoose.Schema} */
const UserSchema = new mongoose.Schema(UserObject);

const model = mongoose.model('UserObject', UserSchema);

/** @type {(schema:UserObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = UserSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
