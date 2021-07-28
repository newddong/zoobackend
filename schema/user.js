const mongoose = require("mongoose");
const UserSchema = new mongoose.Schema({
	id: {type:String},
	password: {type:String},
	name: {type:String},
    userType:{type:String},
    idType:{type:String},
    nickname:{type:String},
    mobilecompany:{type:String},
    shelter_name:{type:String},
    shelter_addr:{type:String},
    shelter_phone:{type:String},
    shelter_email:{type:String},
    shelter_url:{type:String},
    shelter_foundation_date:{type:Date,default:Date.now},
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
    profileImgUri:{type:String},
});

module.exports = mongoose.model("user", UserSchema);


