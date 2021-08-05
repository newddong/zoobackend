const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
	id: {type:String},
	password: {type:String},
	name: {type:String},
    nickname:{type:String},

    userType:{type:String},
    idType:{type:String},
    
    mobilecompany:{type:String},
    
    shelter_name:{type:String},
    shelter_addr:{type:String},
    shelter_phone:{type:String},
    shelter_email:{type:String},
    shelter_url:{type:String},
    shelter_foundation_date:{type:Date,default:Date.now},
    
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
    
    count:{type:String},
    text_intro:{type:String},
    profileImgUri:{type:String},
    
    belonged_pets:[{type:String}],
    volunteeractivity:[{type:String}],
    postList:[{type:String}]
});

module.exports.schema = UserSchema;
module.exports.model = mongoose.model("user", UserSchema);


