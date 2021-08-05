const mongoose = require("mongoose");
const FeedSchema = new mongoose.Schema({
	id: {type:String},
	photo: {type:String},
    count:{type:String},
    text_intro:{type:String},
    nickname:{type:String},
    belonged_pets:[{type:String}],
    volunteeractivity:[{type:String}],
    feeds:[{type:String}],
    reg_date:{type:Date,default:Date.now},
    upd_date:{type:Date,default:Date.now},
});

module.exports = mongoose.model("feed", FeedSchema);