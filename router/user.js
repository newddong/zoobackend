const express = require("express");
const router = express.Router();
const User = require("../schema/user");

router.post("/add", (req, res) => {
	console.log("add user => " + req.body.id);
	var user = new User({ 
        id: req.body.id,
        password: req.body.password,
        name: req.body.name,
        userType:req.body.userType,
        idType:req.body.idType,
        nickname:req.body.nickname,
        shelter_name:req.body.shelter_name,
        shelter_addr:req.body.shelter_addr,
        shelter_phone:req.body.shelter_phone,
        shelter_email:req.body.shelter_email,
        shelter_url:req.body.shelter_url,
        shelter_foundation_date:req.body.shelter_foundation_date,
        reg_date:req.body.reg_date,
        upd_date:req.body.upd_date,
        
    
    });
	user.save((err) => {
		if (err) {
			console.log("error during add user " + err);
			res.json({ status: 400, msg: err });
			// return;
		}
		console.log("successfully added user " + req.body.id);
		res.json({ status: 200, msg: "successed" });
	});
});

router.post("/update", (req, res) => {});

router.post("/delete", (req, res) => {});

module.exports = router;

var authUser = (database, id, password, callback) => {
	console.log("authUser 호출됨 : " + id + ", " + password);
	UserModel.find({ id: id, password: password }, (err, results) => {
		if (err) {
			callback(err, null);
			return;
		}
		console.log("아이디 [%s], 비밀번호 [%s]로 사용자 검색 결과", id, password);
		console.dir(results);
		if (results.length > 0) {
			console.log("일치하는 사용자 찾음", id, password);
			callback(null, results);
		} else {
			console.log("일치하는 사용자를 찾지 못함");
			callback(null, null);
		}
	});
};
