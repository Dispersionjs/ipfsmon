#!/usr/bin/env node --harmony

const fs = require('fs');
const https = require('https');
const program = require('commander');
const ipfsAPI = require('ipfs-api')();
const events = require('events');
const exec = require('child_process').exec
const path = require('path');

// exec('ipfs daemon', (error, stdout, stderr) => {
//   if (error) {
//     console.error(`exec error: ${error}`);
//     return;
//   }
//   console.log(`stdout: ${stdout}`);
//   console.log(`stderr: ${stderr}`);
// });
// const util = require('util');

function Watcher(path) {
  this.dir = fs.lstatSync(path).isDirectory();
  this.path = path;
}

Watcher.prototype = new events.EventEmitter();
Watcher.prototype.watch = () => {
  if (this.dir) {
    fs.readdir(this.path, (err, files) => {
      if (err) console.error(err);
      console.log('files in watch', files);
      this.emit('hash', files);
    });
  } else {
    fs.readFile(this.path, (err, file) => {
      console.log('inside watch fs.readfile')
      this.emit('hash', file);
    });
  }
}
Watcher.prototype.start = () => {
  console.log(this);
  console.log(this.path);
  fs.watchFile(this.path, () => this.watch());
}
const hashes = [];
const hashFile = (file, dir = false) => {
  console.log('file, dir in hashfile', file, dir);
  if (dir) {
    exec(`ipfs add -r ${file}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log()
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    });
  } else {
    exec(`ipfs add ${file}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.log(`stderr: ${stderr}`);
    });
  }

  // if (fs.lstatSync(file).isDirectory()) {
  //   ipfsAPI.util.addFromFs(file, { recursive: true }, (err, result) => {
  //     console.log('file inside hash file callback function: ', file);
  //     console.log('result inside hshfile', result);
  //     if (err) {
  //       throw err
  //     }
  //     let options = { host: "ipfs.io", path: `/ipfs/${result[0]["hash"]}` }
  //     callback = (res) => {

  //       res.on('error', (err) => {
  //         console.error(err);
  //       })
  //     }
  //     https.request(options, callback).end()
  //   });
  // } else {
  //       ipfsAPI.util.addFromFs(file, (err, result) => {
  //     console.log('file inside hash file callback function: ', file);
  //     console.log('result inside hshfile', result);
  //     if (err) {
  //       throw err
  //     }
  //     let options = { host: "ipfs.io", path: `/ipfs/${result[0]["hash"]}` }
  //     callback = (res) => {
  //       // let str = '';
  //       // res.on('data', chunk => {
  //       //   str += chunk;
  //       // })
  //       // res.on('end', () => console.log(str));
  //       res.on('error', (err) => {
  //         console.error(err);
  //       })
  //     }
  //     https.request(options, callback).end()
  //   });
  // }
}




program
  .arguments('<file>')
  // .option('-u, --username <user÷name>', 'The user to authenticate as')
  // .option('-p, --password <password>', 'The user\'s password')
  .action(function (file) {
    exec('pwd', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      let filePath = path.resolve(stdout.trim(), file.trim());
      console.log(filePath);
      hashFile(filePath, fs.lstatSync(filePath).isDirectory());
      console.log('made it past hashfile');
      const watcher = new Watcher(filePath);
      console.log(watcher);
      watcher.on('hash', (files) => {
        hashfile(files, watcher.dir);
      });
      watcher.start();
    });
  })
  .parse(process.argv);
