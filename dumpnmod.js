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

const Compressor = require("./src/compressor");
    
if (yargs._.length!=1) {
    console.error("Usage: node",yargs.$0,"<nmod_filename>");
    process.exit(1);
}

var inFileName = yargs._[0]
console.log("Loading file:",inFileName);
fs.readFile(inFileName, onFileLoaded);

var periodTable = [
	[
		// ; Tuning 0, Normal
		856,808,762,720,678,640,604,570,538,508,480,453,
		428,404,381,360,339,320,302,285,269,254,240,226,
		214,202,190,180,170,160,151,143,135,127,120,113
	],
	[
		// ; Tuning 1
		850,802,757,715,674,637,601,567,535,505,477,450,
		425,401,379,357,337,318,300,284,268,253,239,225,
		213,201,189,179,169,159,150,142,134,126,119,113
	],
	[ 
		// ; Tuning 2
		844,796,752,709,670,632,597,563,532,502,474,447,
		422,398,376,355,335,316,298,282,266,251,237,224,
		211,199,188,177,167,158,149,141,133,125,118,112
	],
	[
		// ; Tuning 3
		838,791,746,704,665,628,592,559,528,498,470,444,
		419,395,373,352,332,314,296,280,264,249,235,222,
		209,198,187,176,166,157,148,140,132,125,118,111
	],
	[
		// ; Tuning 4
		832,785,741,699,660,623,588,555,524,495,467,441,
		416,392,370,350,330,312,294,278,262,247,233,220,
		208,196,185,175,165,156,147,139,131,124,117,110
	],
	[
		// ; Tuning 5
		826,779,736,694,655,619,584,551,520,491,463,437,
		413,390,368,347,328,309,292,276,260,245,232,219,
		206,195,184,174,164,155,146,138,130,123,116,109
	],
	[
		// Tuning 6
		820,774,730,689,651,614,580,547,516,487,460,434,
		410,387,365,345,325,307,290,274,258,244,230,217,
		205,193,183,172,163,154,145,137,129,122,115,109
	],
	[
		// Tuning 7
		814,768,725,684,646,610,575,543,513,484,457,431,
		407,384,363,342,323,305,288,272,256,242,228,216,
		204,192,181,171,161,152,144,136,128,121,114,108
	],
	[
		// Tuning -8
		907,856,808,762,720,678,640,604,570,538,508,480,
		453,428,404,381,360,339,320,302,285,269,254,240,
		226,214,202,190,180,170,160,151,143,135,127,120
	],
	[
		// Tuning -7
		900,850,802,757,715,675,636,601,567,535,505,477,
		450,425,401,379,357,337,318,300,284,268,253,238,
		225,212,200,189,179,169,159,150,142,134,126,119
	], 
	[
		// Tuning -6
		894,844,796,752,709,670,632,597,563,532,502,474,
		447,422,398,376,355,335,316,298,282,266,251,237,
		223,211,199,188,177,167,158,149,141,133,125,118
	],
	[
		// Tuning -5
		887,838,791,746,704,665,628,592,559,528,498,470,
		444,419,395,373,352,332,314,296,280,264,249,235,
		222,209,198,187,176,166,157,148,140,132,125,118
	],
	[
		// Tuning -4
		881,832,785,741,699,660,623,588,555,524,494,467,
		441,416,392,370,350,330,312,294,278,262,247,233,
		220,208,196,185,175,165,156,147,139,131,123,117
	],
	[
		// Tuning -3
		875,826,779,736,694,655,619,584,551,520,491,463,
		437,413,390,368,347,328,309,292,276,260,245,232,
		219,206,195,184,174,164,155,146,138,130,123,116
	],
	[
		// Tuning -2
		868,820,774,730,689,651,614,580,547,516,487,460,
		434,410,387,365,345,325,307,290,274,258,244,230,
		217,205,193,183,172,163,154,145,137,129,122,115
	],
	[
		// Tuning -1
		862,814,768,725,684,646,610,575,543,513,484,457,
		431,407,384,363,342,323,305,288,272,256,242,228,
		216,203,192,181,171,161,152,144,136,128,121,114
	]
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
        var restartFrom = [];

        var endTracks = false;

        do {

            var endTrack = false;
            var track = [];

            do {
                var word = data.readUInt32BE(offset);
                
                if (word < 0xffff0000) {
                    track.push(word);
                    offset+=4;
                }
                else {
                    offset+=2;
                    word = data.readUInt32BE(offset);
                    restartFrom.push(word);
                    offset+=4;
                    endTrack = true;
                    word = data.readUInt16BE(offset);
                    if (word === 0xffff) {
                        endTracks = true;
                    }
                }
            } while (!endTrack);

            track = Compressor.decompressLz(track);

            _.remove(track, function(word) {
                return (word >= 0xc0000000);
            });

            tracks.push(track);

        } while (!endTracks);
/*         var word = data.readUInt32BE(offset);

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

            restartFrom.push(data.readUInt32BE(offset));
            offset += 2;

        } */

        tracks = _.zip.apply(_, tracks);

        offset += 2;
        var dmaBits = data.readUInt16BE(offset);
        offset += 2;

        console.log("\nInitial DMA bits:",dmaBits);

        word = data.readUInt16BE(offset);

        var instruments = [];

        while(word != 0xffff) {
            var sampleStart = data.readUInt32BE(offset);
            offset += 4;
            var loopStart = data.readUInt32BE(offset);
            offset += 4;
            var sampleLength = data.readUInt16BE(offset);
            offset += 2;
            var loopLength = data.readUInt16BE(offset);
            offset += 2;
            word = data.readUInt16BE(offset);

            instruments.push({
                sampleStart: sampleStart,
                loopStart: loopStart,
                sampleLength: sampleLength,
                loopLength: loopLength
            })
        }

        offset += 2;
 
        
        // skip over the decompression buffer sizes
        offset += (tracks[0].length * 2);

        var sampleData = data.slice(offset);

        for (var instrument=0;instrument<instruments.length;instrument++) {
            console.log("\nInstrument",instrument+1,":\n---------------");
            console.log("Sample start:",instruments[instrument].sampleStart,sampleData.slice(instruments[instrument].sampleStart,instruments[instrument].sampleStart+2));
            console.log("Loop start:",instruments[instrument].loopStart,sampleData.slice(instruments[instrument].loopStart,instruments[instrument].loopStart+2));
            console.log("Sample length:",instruments[instrument].sampleLength);
            console.log("Loop length:",instruments[instrument].loopLength);
        }

        console.log('\n\nPattern data:\n-------------\n');

        for (var tick=0;tick<tracks.length;tick++) {
            
            if ((tick > 0) && (tick / yargs.speed) % 64 == 0) {
                console.log('----------------------------------------------------------------------------------')
            }
            
            var line = _.padStart(tick,6);

            for(var track=0;track<tracks[tick].length;track++) {
                var volume = (tracks[tick][track] >>> 25) & 0x007F
                var newNoteFlag = (tracks[tick][track] >>> 24) & 0x0001
                var dmaStopFlag = (tracks[tick][track] >>> 23) & 0x0001
                
                var period; 
                var instrumentNumber;
                var finetune;

                if (newNoteFlag) {

                    var finetune = 0;
                    var periodIndex;

                    do {
                        periodIndex = periodTable[finetune++].indexOf(tracks[tick][track] & 0x3FF);
                    } while ((periodIndex == -1) && (finetune < 16))

                    finetune--;

                    if (finetune > 7) {
                        finetune -= 16;
                    }

                    finetune = _.padStart(finetune,2);

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
                    finetune = '  ';
                }

                line += period;
                line += ' ';
                line += instrumentNumber + ' ';
                line += finetune + ' ';
                line += _.padStart(volume,2);
                line += ' ';
                line += dmaStopFlag ? '*':' ';
                line += '  ';
            }
            console.log(line);

        }
        console.log("Done");
    }
