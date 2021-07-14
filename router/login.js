const express = require("express");
const router = express.Router();
const User = require("../schema/user");


router.post("/", (req, res) => {
	console.log('try to login. id : '+req.body.id);
    User.find({id:req.body.id,password:req.body.password},(err,result)=>{
        if(err){
            console.log('error on login'+err);
            res.send({code:400,msg:err});
        }
        res.send({code:200,msg:result});
    })
});

module.exports = router;