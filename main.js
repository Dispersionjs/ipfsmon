#!/usr/bin/env node --harmony

const fs = require('fs');
const https = require('https');
const program = require('commander');
const ipfsAPI = require('ipfs-api')();
const events = require('events');
// const util = require('util');

function Watcher(watchDir) {
  this.watchDir = watchDir;
}

Watcher.prototype = new events.EventEmitter();
Watcher.prototype.watch = () => {
  fs.readdir(this.watchDir, (err, files) => {
    if (err) console.error(err);
    this.emit('hash', files);
  });
}
const hashes = [];
const hashFile = (file) => {
  ipfsAPI.util.addFromFs(file, (err, result) => {
    console.log('file inside hash file function: ', file);
    if (err) {
      throw err
    }
    let options = { host: "ipfs.io", path: `/ipfs/${result[0]["hash"]}` }
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
    https.request(options, callback).end()
  })
}
Watcher.on('hash', (files) => {
  hashfile(files);
})
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
    // var ipfs = ipfsAPI('localhost', '5001', { protocol: 'http' }) 
    // ipfsOG


    
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