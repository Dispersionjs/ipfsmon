#!/usr/bin/env node --harmony
const fs = require('fs');
const https = require('https');
const program = require('commander');
const ipfsAPI = require('ipfs-api')();
const events = require('events');
const exec = require('child_process').exec
const path = require('path');
const request = require('request');
const IpfsDaemon = require('ipfs-daemon')
const chokidar = require('chokidar');

// One-liner for current directory, ignores .dotfiles


try {
  fs.lstatSync(process.argv[process.argv.length - 1]);
} catch (e) {
  console.log('ipfsmon can not find file or directory to watch, please specify a path to an existing file or directory');
  process.exit(1);
}

IpfsDaemon()
  .then((res) => {
    start();
    // res.ipfs - an IPFS API instance (js-ipfs and js-ipfs-api)
    // res.daemon - IPFS daemon (ipfsd-ctl/node)
    // res.Addresses - IPFS daemon's API, Gateway and Swarm addresses
  })
  .catch((err) => console.error(err))


// if (!fs.lstatSync(file)) {
//   console.error(file + ' is not a file or directory');
//   process.exit()
// }

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
      let hashArr = stdout.trim().split('\n');
        hashArr.forEach((item, index, array) => {
        let hashObj = makeHashObject(item)
        if (index === array.length -1) hashes.push(hashObj);
        requestHashObject(hashObj);
      })
      console.log(hashes);
    });
  } else {
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
    let url = hashObject[key]["url"]
    for (let i = 0; i < 10; i++) {
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
    .option('-i, --include', 'Include all files and foldes [node_modules excluded by default]')
    // .option('-p, --password <password>', 'The user\'s password')
    .action(function (file) {
      let options = program.include ? { ignored: /[\/\\]\./ } : { ignored: /([\/\\]\.)|(node_modules)/ };
      console.log(options);
      if (program.timeline) keepTimeline = true;
      isDirectory = fs.lstatSync(file).isDirectory();
      console.log(`ipfsmon is now watching ${file} [type: ${isDirectory ? "Directory" : "File"}]\nit will rehash and post to ipfs on change`)
      // hashFile(file, isDirectory);
      chokidar.watch(file, options).on('all', (event, path) => {
      // chokidar.watch(file, { ignored: new RegExp(`([\/\\]\.)'|(node_modules)'`) }).on('all', (event, path) => {
        hashFile(file, isDirectory);
        console.log(event, path);
      });
      // fs.watch(file, (e) => {
      //   if (!cooldown) {
      //     hashFile(file, isDirectory);
      //     cooldown = true;
      //     setTimeout(() => cooldown = false, 5000)
      //   }
      // })
    })
    .parse(process.argv);
}

