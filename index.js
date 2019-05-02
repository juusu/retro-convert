"use strict";

var Module = require("./ptmod");
var fs = require("fs");
var _ = require("lodash");

const SLIDING_WINDOW_SIZE = 4096

if (process.argv.length<3) {
	console.error("Usage: node",process.argv[1],"<mod_filename>");
	process.exit(1);
}

var inFileName = process.argv[2];

console.log("Loading file:",inFileName);

fs.readFile(inFileName, onFileLoaded);

function onFileLoaded(err, data) {
	if (err) {
		console.log(err.message);
		process.exit(1);
	}
	console.log("Loaded:",data.length,"bytes");

	var mod = new Module(data);

	console.log("Title:",mod.title);

	var numInstruments = 0;

	for (var i=0;i<mod.instruments.length;i++) {
		if (mod.instruments[i].length > 0) {
			numInstruments++;
		}
	}

	console.log("Instruments:",numInstruments);
	console.log("Song length:",mod.sequence.length);
	console.log("Patterns:",mod.patterns.length);
	console.log("Raw pattern data length",mod.patterns.length*1024,"bytes");
	console.log("Sample data length",mod.sampleData.length,"bytes");

	var removedPatterns=0;

	for (var i=0;i<mod.patterns.length;i++) {
		if (!mod.sequence.includes(mod.patterns[i])) {
			mod.patterns.splice(i,1);
			removedPatterns++;
			i--;
		}
	}

	console.log("\nOPTIMIZATION REPORT\n-------------------")

	console.log("\nUnused patterns removed:",removedPatterns);
	console.log("Remaining patterns:",mod.patterns.length);
	console.log("Pattern data saved:",removedPatterns*1024,"bytes");
	console.log("Optimized pattern data length:",mod.patterns.length*1024,"bytes");

	var usedInstruments = new Set();

	for (var pattern=0;pattern<mod.patterns.length;pattern++) {
		for (var track=0;track<4;track++) {
			for (var row=0; row<64; row++) {
				if (mod.patterns[pattern].tracks[track][row].instrument > 0){
					usedInstruments.add(mod.patterns[pattern].tracks[track][row].instrument);
				}
			}
		}
	}

	var removedSamples = 0;
	var sampleBytesSaved = 0;

	for (var i=0;i<mod.instruments.length;i++) {
		if (mod.instruments[i].length > 0) {
			if (!usedInstruments.has(mod.instruments[i].number)) {
				sampleBytesSaved += mod.killInstrument(mod.instruments[i].number);
				removedSamples++;
			}
		}
	}

	console.log("\nUnused samples removed:",removedSamples);
	console.log("Remaining samples:",usedInstruments.size);
	console.log("Sample data saved:",sampleBytesSaved,"bytes");
	console.log("Optimized sample data length:",mod.sampleData.length,"bytes");

	var removedDuplicatePatterns = 0;

	for (var i=0;i<mod.patterns.length;i++) {
		for (var j=i+1;j<mod.patterns.length;j++) {
			var patternsAreEqual = true;
			for (var t=0;t<4;t++) {
				var patternsAreEqual = patternsAreEqual && _.isEqual(mod.patterns[i].tracks[t],mod.patterns[j].tracks[t]);
			}
			if (patternsAreEqual) {
				var index = mod.sequence.indexOf(mod.patterns[j]);
				
				// replace all occurences of the 2nd duplicate pattern in the sequence with the first one
				while (index!=-1) {
					mod.sequence[index] = mod.patterns[i];
					index = mod.sequence.indexOf(mod.patterns[j]);
				}

				mod.patterns.splice(j,1);
				j--;
				removedDuplicatePatterns++;
			}
		}
	}

	console.log("\nDuplicate patterns removed:",removedDuplicatePatterns);
	console.log("Pattern data saved:",removedDuplicatePatterns*1024,"bytes");	

	console.log("\nTOTAL SAVED:",sampleBytesSaved+removedPatterns*1024+removedDuplicatePatterns*1024,"bytes");
	console.log("Optimized mod length:",mod.patterns.length*1024+mod.sampleData.length+1084,"bytes");
	//console.log(util.inspect(mod, {showHidden: false, depth: null}))

	var vBlankSpeed=6;
	var ticks=0;
	var notes=0;
	var newNotes=0;

	var noteTriggerData=[[],[],[],[]];

	for (var p=0;p<mod.sequence.length;p++) {	
		for (var r=0;r<64;r++) {

			// pick up speed first
			for (var t=0;t<4;t++) {
				// read row
				var row = mod.sequence[p].tracks[t][r];

				switch (row.command) {
					case 0xF:
						if (mod.sequence[p].tracks[t][r].parameter < 0x20) {
							//console.info("vblank tempo set to:",mod.sequence[p].tracks[t][r].parameter);
							vBlankSpeed = mod.sequence[p].tracks[t][r].parameter;
						}
						else {
							//console.info("ignoring bpm tempo:",mod.sequence[p].tracks[t][r].parameter);
						}
						break;
				}
			}

			// note trigger data
			for (var t=0;t<4;t++) {
				// read row
				var row =mod.sequence[p].tracks[t][r];

				if (row.note != 0) {
					switch (row.command) {
						case 0x3:
						case 0x5:
							noteTriggerData[t].push.apply(noteTriggerData[t],_.times(vBlankSpeed, _.constant(0)));
							break;
						case 0xE:
							if (row.parameter & 0xF0 == 0xD0) {
								var delay = row.parameter & 0x0F;
								noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.min(delay,vBlankSpeed), _.constant(0)));
								if (delay<vBlankSpeed) {
									noteTriggerData[t].push(row.note);
								}
								noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.max(0,vBlankSpeed-delay-1), _.constant(0)));
							}
							else {
								noteTriggerData[t].push.apply(noteTriggerData[t],_.times(vBlankSpeed, _.constant(0)));
							}
							break;
						default:
							noteTriggerData[t].push(row.note);
							noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.max(0,vBlankSpeed-1), _.constant(0)));
					}
				}
				// no new note
				else {
					noteTriggerData[t].push.apply(noteTriggerData[t],_.times(vBlankSpeed, _.constant(0)));
				}
			}

			ticks += vBlankSpeed;
		}
	}

	console.log("\nCONVERSION REPORT\n-----------------\n\nMusic duration:",ticks,"frames");
	console.log("Notes:",notes);
	console.log("Newnotes:",newNotes,"\n");

	var uncompressedTracksSize = 0;

	for (var t=0;t<4;t++) {
		console.log("Track",t,"length:",noteTriggerData[t].length*4,"bytes");
		uncompressedTracksSize+=noteTriggerData[t].length*4;
	}

	console.log("Uncompressed track data:",uncompressedTracksSize,"bytes\n");

	var compressedTracks = [[],[],[],[]];

	// try to compress the tracks
	for (var t=0;t<4;t++) {

		for (var i=0;i<noteTriggerData[t].length;i++) {

			//console.log("i:",i);
			
			var matches = [];
			var matchLength = 0;

			// find initial matches for input token in sliding window
			for (var j=Math.max(0,i-SLIDING_WINDOW_SIZE);j<i;j++) {
				//console.log("j:",j);
				if (noteTriggerData[t][j] == noteTriggerData[t][i]) {
					matches.push(j);
					matchLength = 1;
				}
			}


			// find the longest one
			do {
				var newMatches = []

				for (var m=0;m<matches.length;m++) {
					if (noteTriggerData[t][matches[m]+matchLength] == noteTriggerData[t][i+matchLength]) {
						newMatches.push(matches[m]);
					}
				}
				if (newMatches.length > 0) {
					matchLength++;
					matches = newMatches;
				}
			} while (newMatches.length > 0);


			if (matchLength > 1) {
				var offset = i - matches[matches.length-1];
				compressedTracks[t].push("MATCH "+ offset + "," + matchLength);
				i+=matchLength-1;
			}

			else {
				compressedTracks[t].push(noteTriggerData[t][i]);
			}
		}
	}

	var compressedTracksSize = 0;

	for (var t=0;t<4;t++) {
		console.log("Track",t,"compressed length:",compressedTracks[t].length*4,"bytes");
		compressedTracksSize+=compressedTracks[t].length*4;
	}

	console.log("Compressed track data:",compressedTracksSize,"bytes");

}