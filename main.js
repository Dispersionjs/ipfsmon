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
let hashes = {};
let hist = [];
let log = false;

let daemonId = null;
console.log('ipfsmon initializing, please wait');

function startDaemon() {
  let daemonCommand = spawn('ipfs', ['daemon']);
  daemonId = daemonCommand.pid;
  daemonCommand.stdout.on('data', function (data) {
    let dataString = data.toString();
    let result = /Daemon is ready/.test(dataString);
    if (result) {
      console.log('Daemon started');
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
  // daemonCommand.on('SIGINT', () => {
  //   console.log("daemon exited")
  //   process.exit(0)
  // });
}
startDaemon();



//TODO: exit ggracefully and allow daemon time to shut itself down 
function exitHandler() {
  process.stdin.resume()
  console.log('\nbye bye');
  process.exit(0);
  // console.log('in exit handler')
  // console.log('daemonId: ', daemonId);
  // // process.kill(daemonId, 'SIGINT');
  // setInterval(() => {
  //   console.log('bye bye');
  //   process.exit(0);
  // }, 1000);
}


try {
  fs.lstatSync(process.argv[process.argv.length - 1]);
} catch (e) {
  console.log('ipfsmon can not find file or directory to watch, please specify a path to an existing file or directory');
  process.exit(1);
}

process.on('SIGINT', exitHandler)


const hashFile = (file, dir = false, top = false) => {
  if (dir) {
    exec(`ipfs add -r '${file}'`, (error, stdout, stderr) => {
      if (error) {
        if (log) console.error(`exec error: ${error}`);
        return;
      }
      //for Each file in updated directory, rehash the file and send a request to cache
      //Also add new hashes to "hashes" akak history
      if (!keepTimeline) hist = [];

      let hashArr = stdout.trim().split('\n');
      if (log) console.log(hashArr.map(item => console.log('ipfs' + item)));


      hashArr.forEach((item, index, array) => {
        let hashObj = makeHashObject(item);
        let hash = Object.keys(hashObj)[0]
        if (!hashes[hash]) {
          hashes[hash] = hashObj[hash];
          requestHashObject(hash);
        }
        if (index === array.length - 1) hist.push(hashObj);
      })
      if (top) console.log(hist);
    });
  } else {
    exec(`ipfs add '${file}'`, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return;
      }
      //Shift new hash into file update history
      if (!keepTimeline || !log) hist = [];
      let hashObj = makeHashObject(stdout);

      let hash = Object.keys(hashObj)[0]
      hashes[hash] = hashObj[hash];
      hist.push(hashObj);

      //Make request to generated ipfs hashlink of updated data
      requestHashObject(hash);
      console.log(hist);
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
function requestHashObject(hash) {
    let url = hashes[hash]["url"]
    for (let i = 0; i < 5; i++) {
      let name = hashes[hash]["file"];
        if (log) console.log('\nsending for ' + name + '\nurl:' + url);
      request(url, (err, response, body) => {
        if (err) {
          console.log('error making distribute request to IPFS');
          console.error(err);
        } 
      })
    }
}
function start() {
  program
    .arguments('<file>')
    .option('-t, --timeline', 'Keep revision timeline')
    .option('-l, --log', 'log all hash objects')
    .option('-i, --include', 'Include all files and foldes [node_modules excluded by default]')
    .action(function (file) {
      let options = program.include ? { ignored: /[\/\\]\./ } : { ignored: /([\/\\]\.)|(node_modules)/ };
      if (program.timeline) keepTimeline = true;
      if (program.log) log = true;
      isDirectory = fs.lstatSync(file).isDirectory();
      console.log(`Ipfsmon is now watching ${file} [type: ${isDirectory ? "Directory" : "File"}]\nit will rehash and post to ipfs on change`);
      chokidar.watch(file, options).on('all', (event, path) => {
        if (!options.ignored.test(path)) hashFile(file, isDirectory, path === file);
        if(log) console.log(event, path);
      });
    })
    .parse(process.argv);
}

