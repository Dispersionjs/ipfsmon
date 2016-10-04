#!/usr/bin/env node --harmony

var fs = require('fs');
var https = require('https');
var program = require('commander');
var ipfsAPI = require('ipfs-api')();
// var ipfsOG = require('ipfs')
// var ProgressBar = require('progress');
//   var chalk = require('chalk');
//   var request = require('superagent');
//   var username = yield prompt('username: ');
// var password = yield prompt.password('password: ');



program
  .arguments('<file>')
  // .option('-u, --username <user÷name>', 'The user to authenticate as')
  // .option('-p, --password <password>', 'The user\'s password')
  .action(function (file) {
    // var ipfs = ipfsAPI('localhost', '5001', { protocol: 'http' }) // leaving out the arguments will default to these values 
    // ipfsOG
    

    ipfsAPI.util.addFromFs(file, (err, result) => {
      if (err) {
        throw err
      }
      let options = { host: "ipfs.io", path: "/ipfs/" + result[0]["hash"] }
      console.log(options.path, options.hash);
      callback = (res) => {
        let str = '';
        res.on('data', chunk => {
          str += chunk;
        })
        res.on('end', () => console.log(str));
        res.on('error', (err) => {
          console.error(err);
        })
      }
      https.request(options, callback).end();
      console.log(result)
    })
  })
  .parse(process.argv);


// var fileSize = fs.statSync(file).size;
// var fileStream = fs.createReadStream(file);
// var barOpts = {
//   width: 20,
//    total: fileSize,
//    clear: true
//  };
//  var bar = new ProgressBar(' uploading [:bar] :percent :etas', barOpts);

//  fileStream.on('data', function (chunk) {
//   bar.tick(chunk.length);
//  });

//   request
//     .post('https://api.bitbucket.org/2.0/snippets/')
//     .auth(username, password)
//    .attach('file', file)
//    .attach('file', fileStream)
//     .set('Accept', 'application/json')