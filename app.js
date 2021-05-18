var fs = require('fs');
var http = require('http');
var url = require('url');
var ROOT_DIR = "html/";
http.createServer(function(req,res){
    res.write('<h1>API서버 개발중입니다</h1');
    res.end('<p><br>열씸히!<p>');//주석
}).listen(3000,()=>{
    console.log('3000번 대기중');
});