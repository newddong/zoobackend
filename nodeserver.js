var fs = require('fs');
var http = require('http');
var url = require('url');
var ROOT_DIR = "html/";
http.createServer(function(req,res){
    res.write('<h1>heelo</h1');
    res.end('<p>hellp<p>');
}).listen(3000,()=>{
    console.log('3000번 대기중');
});