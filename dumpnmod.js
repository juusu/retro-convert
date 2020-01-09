"use strict";

const fs = require("fs");
const _ = require("lodash");
const yargs = require("yargs")
    .argv;
    
if (yargs._.length!=1) {
    console.error("Usage: node",yargs.$0,"<nmod_filename>");
    process.exit(1);
}

var inFileName = yargs._[0]
console.log("Loading file:",inFileName);
fs.readFile(inFileName, onFileLoaded);

function onFileLoaded(err, data) {
        if (err) {
            console.log(err.message);
            process.exit(1);
        }
        console.log("Loaded:",data.length,"bytes");

        var offset = 0;

        var tracks = [];

        var word = data.readUInt32BE(offset);

        while (word != 0xffffffff) {

            var track = [];
            word = data.readUInt32BE(offset);

            while (word < 0xffff0000) {
                track.push(word);
                offset += 4;
                word = data.readUInt32BE(offset);
            }
            
            tracks.push(track);
            offset += 2;
        }

        tracks = _.zip.apply(_, tracks);

        for (var tick=0;tick<tracks.length;tick++) {
            var line = "";
            for(var track=0;track<tracks[tick].length;track++) {
                var volume = (tracks[tick][track] >>> 25) & 0x007F
                line += volume;
                line += "\t";
            }
            console.log(line);
        }
        console.log("Done");
    }

// tr 0: 0
// marker 0: 23680
// tr 1: 23682