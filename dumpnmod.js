"use strict";

const fs = require("fs");
const _ = require("lodash");
const yargs = require("yargs")
    .option('speed', {
        alias: 'f',
        default: 6,
        type: 'integer'
    })
    .argv;
    
if (yargs._.length!=1) {
    console.error("Usage: node",yargs.$0,"<nmod_filename>");
    process.exit(1);
}

var inFileName = yargs._[0]
console.log("Loading file:",inFileName);
fs.readFile(inFileName, onFileLoaded);


var periodTable = [
    // ; Tuning 0, Normal
        856,808,762,720,678,640,604,570,538,508,480,453,
        428,404,381,360,339,320,302,285,269,254,240,226,
        214,202,190,180,170,160,151,143,135,127,120,113
    ];

var noteNames = ['C-','C#','D-','D#','E-','F-','F#','G-','G#','A-','A#','B-'];

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
            
            if ((tick > 0) && (tick / yargs.speed) % 64 == 0) {
                console.log('----------------------------------------------------------------------------------')
            }
            var line = "";
            for(var track=0;track<tracks[tick].length;track++) {
                var volume = (tracks[tick][track] >>> 25) & 0x007F
                var newNoteFlag = (tracks[tick][track] >>> 24) & 0x0001
                var dmaStopFlag = (tracks[tick][track] >>> 23) & 0x0001
                
                var period; 
                var instrumentNumber;

                if (newNoteFlag) {
                    var periodIndex = periodTable.indexOf(tracks[tick][track] & 0x3FF);
                    var octave = Math.floor(periodIndex / 12) + 1;
                    var noteName = noteNames[periodIndex % 12];
                    
                    period = _.padStart(noteName + octave,4);

                    instrumentNumber = _.padStart((tracks[tick][track] >>> 10) & 0x00ff,2,'0');
                }
                else {
                    period = tracks[tick][track] & 0xFF;
                    if (period > 127) { 
                        period = period - 256; 

                    }
                    else if (period > 0) {
                        period = '+' + period;
                    }
                    else {
                        period = 0;
                    }
                    period = _.padStart(period,4);
                    instrumentNumber = '  ';
                }

                line += _.padStart(tick,6)
                line += ' ';
                line += period;
                line += ' ';
                line += instrumentNumber + ' ';
                line += _.padStart(volume,2);
                line += ' ';
                line += dmaStopFlag ? '*':' ';
                line += '  ';
            }
            console.log(line);

        }
        console.log("Done");
    }