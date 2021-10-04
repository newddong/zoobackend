const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const Post = require("./post");

const UserSchema = new mongoose.Schema({
    //기본정보
	id: {type:String},//핸드폰번호 혹은 이메일 로그인시에 사용
	password: {type:String},
	name: {type:String},
    nickname:{type:String},

    userType:{type:String}, //유저타입 : 사람(user),동물(pet),보호소(shelter)
    idType:{type:String}, //계정타입 : 핸드폰(mobile),이메일(email)
    
    mobilecompany:{type:String}, //모바일일경우 통신사
    
    
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
    
    count:{
        upload:{type:Number,default:0},
        follower:{type:Number,default:0},
        following:{type:Number,default:0},
    },


    text_intro:{type:String},
    profileImgUri:{type:String},
    

    belonged_pets:[{type:Schema.Types.ObjectId}], //등록된 팻
    volunteeractivity:[{type:Schema.Types.ObjectId}], //동물보호 활동

    deleted:{type:Boolean,default:false},

    //보호소 관련 정보
    shelter_name:{type:String},
    shelter_addr:{type:String},
    shelter_phone:{type:String},
    shelter_email:{type:String},
    shelter_url:{type:String},
    shelter_foundation_date:{type:Date,default:Date.now},

    //펫 관련 정보
    age:{type:Number,default:0},
    sex:{type:String},
    adoptionType:{type:String},
    animalKind:{type:String},
    animalKindDetail:{type:String},
    animalNo:{type:String},
    owner:{type:Schema.Types.ObjectId}
});

module.exports.schema = UserSchema;
module.exports.model = mongoose.model("user", UserSchema);



