const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const AnnouncementObject = {
	/** @type { String} 공지사항 제목 */
	announcement_title: {type: String},
	/** @type { Array<String>} 첨부 이미지 */
	announcement_uri: [{type: String}],
	/** @type { String} 본문 내용 */
	announcement_contents: {type: String},
	/** @type { Date} 공지사항 날짜 */
	announcement_date: {type: Date, default: Date.now()},
};

/** @type {mongoose.Schema} */
const AnnouncementSchema = new mongoose.Schema(AnnouncementObject);

const model = mongoose.model('AnnouncementObject', AnnouncementSchema);

/** @type {(schema:AnnouncementObject)=>mongoose.Document} */
const makeNewdoc = schema => {
	return new model(schema);
};

module.exports.schema = AnnouncementSchema;
module.exports.model = model;
module.exports.makeNewdoc = makeNewdoc;
