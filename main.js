#!/usr/bin/env node --harmony
const fs = require('fs');
const https = require('https');
const program = require('commander');
const ipfsAPI = require('ipfs-api')();
const events = require('events');
const exec = require('child_process').exec
const path = require('path');
const request = require('request');

let isDirectory;
let cooldown = false;
let keepTimeline = false;

let hashes = [];
const hashFile = (file, dir = false) => {
  if (dir) {
    exec(`ipfs add -r ${file}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      //for Each file in updated directory, rehash the file and send a request to cache
      //Also add new hashes to "hashes" akak history
      if (!keepTimeline) hashes = [];
      stdout.trim().split('\n').forEach((item) => {
        let hashObj = makeHashObject(item)
        hashes.push(hashObj)
        requestHashObject(hashObj);
      })
      console.log(hashes);

    });
  } else {
    console.log('inside bottom');
    exec(`ipfs add -r ${file}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      //Shift new hash into file update history
      if (!keepTimeline) hashes = [];
      let hashObj = makeHashObject(stdout);
      hashes.push(hashObj)
      //Make request to generated ipfs hashlink of updated data
      requestHashObject(hashObj)
      console.log(hashes)
    });
  }
}

function makeHashObject(hString) {
  var hashArray = hString.split(' ');

  var hashObj = {
    [hashArray[1]]: {
      "file": hashArray[2].trim(),
      "time": new Date().toUTCString(),
      "url": "http://ipfs.io/ipfs/" + hashArray[1]
    }
  }
  return hashObj;
}

function requestHashObject(hashObject) {
  for (let key in hashObject) {
    request(hashObject[key]["url"], (err, response, body) => {
      if (err) {
        console.log('error making distribute request to IPFS');
        console.error(err);
      }
    })
  }
}

program
  .arguments('<file>')
  .option('-t, --timeline', 'Keep revision timeline')
  // .option('-p, --password <password>', 'The user\'s password')
  .action(function (file) {
    if (program.timeline) keepTimeline = true;
    isDirectory = fs.lstatSync(file).isDirectory();
    console.log(`ipfsmon is now watching ${file} [type: ${isDirectory ? "Directory" : "File"}]\nit will rehash and post to ipfs on change`)
    if (!file) {
      console.error('file not found')
      process.exit(1);
    }
    hashFile(file, isDirectory);
    fs.watch(file, (e) => {
      if (!cooldown) {
        hashFile(file, isDirectory);
        cooldown = true;
        setTimeout(() => cooldown = false, 5000)
      }
    })
  })
  .parse(process.argv);
