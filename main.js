#!/usr/bin/env node --harmony
const fs = require('fs');
const https = require('https');
const program = require('commander');
const ipfsAPI = require('ipfs-api')();
const events = require('events');

const child_process = require('child_process')
const exec = child_process.exec
const spawn = child_process.spawn
const path = require('path');
const request = require('request');
const IpfsDaemon = require('ipfs-daemon')
const chokidar = require('chokidar');

let isDirectory;
let cooldown = false;
let keepTimeline = false;
let hashes = [];
let log = false;


console.log('ipfsmon initializing, please wait');
function startDaemon() {
  let daemonCommand = spawn('ipfs', ['daemon']);
  daemonCommand.stdout.on('data', function (data) {
    let dataString = data.toString();
    let result = /Daemon is ready/.test(dataString);
    if (result) {
      console.log('inside');
      start();
    }
  });
  daemonCommand.stderr.on('data', function (data) {
    let dataString = data.toString();
    let result = /daemon is running/.test(dataString);
    if (result) {
      alert('Warning: Daemon already is running in a seperate process! Closing this application will not kill your IPFS Daemon.')
    }
  })
}
startDaemon();


try {
  fs.lstatSync(process.argv[process.argv.length - 1]);
} catch (e) {
  console.log('ipfsmon can not find file or directory to watch, please specify a path to an existing file or directory');
  process.exit(1);
}

const hashFile = (file, dir = false) => {
  if (dir) {
    exec(`ipfs add -r '${file}'`, (error, stdout, stderr) => {
      if (error) {
        if (log) console.error(`exec error: ${error}`);
        return;
      }
      //for Each file in updated directory, rehash the file and send a request to cache
      //Also add new hashes to "hashes" akak history
      if (!keepTimeline) hashes = [];
      let hashArr = stdout.trim().split('\n');
        if (log) console.log(hashArr.map(item => console.log('ipfs' + item)));
      hashArr.forEach((item, index, array) => {
        let hashObj = makeHashObject(item)
        if (index === array.length - 1) hashes.push(hashObj);
        requestHashObject(hashObj);
      })
      console.log(hashes);
    });
  } else {
    exec(`ipfs add '${file}'`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      //Shift new hash into file update history
      if (!keepTimeline || !log) hashes = [];
      let hashObj = makeHashObject(stdout);
      hashes.push(hashObj)
      //Make request to generated ipfs hashlink of updated data
      requestHashObject(hashObj)
    });
  }
}

function makeHashObject(hString) {
  var hashArray = hString.split(' ');
  var hashObj = {
    [hashArray[1]]: {
      "file": hashArray.slice(2).join(' ').trim(),
      "time": new Date().toUTCString(),
      "url": "https://ipfs.io/ipfs/" + hashArray[1]
    }
  }
  if (log) console.log(hashObj);
  return hashObj;
}
function requestHashObject(hashObject) {
  for (let key in hashObject) {
    let url = hashObject[key]["url"]
    for (let i = 0; i < 5; i++) {
      let name = hashObject[key]["file"];
        if (log) console.log('\nsending for ' + name + '\nurl:' + url);
      request(url, (err, response, body) => {
        if (err) {
          console.log('error making distribute request to IPFS');
          console.error(err);
        } 
      })
    }
  }
}
function start() {
  program
    .arguments('<file>')
    .option('-t, --timeline', 'Keep revision timeline')
    .option('-l, --log', 'log all hash objects')
    .option('-i, --include', 'Include all files and foldes [node_modules excluded by default]')
    // .option('-p, --password <password>', 'The user\'s password')
    .action(function (file) {
      let options = program.include ? { ignored: /[\/\\]\./ } : { ignored: /([\/\\]\.)|(node_modules)/ };
      if (program.timeline) keepTimeline = true;
      if (program.log) log = true;
      isDirectory = fs.lstatSync(file).isDirectory();
      console.log(`ipfsmon is now watching ${file} [type: ${isDirectory ? "Directory" : "File"}]\nit will rehash and post to ipfs on change`);
      chokidar.watch(file, options).on('all', (event, path) => {
        if (!options.ignored.test(path)) hashFile(file, isDirectory);
        console.log(event, path);
      });
    })
    .parse(process.argv);
}

