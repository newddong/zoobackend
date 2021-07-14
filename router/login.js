const express = require("express");
const router = express.Router();
const User = require("../schema/user");


router.post("/login", (req, res) => {
	console.log("login user => " + req.body.id);
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