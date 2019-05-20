// TODO:
//
// E5x & E6x (pattern loop) command
// EEx command (pattern delay)
// 7xx command
// 9xx command
// 0xx command
// finetune


"use strict";

var Module = require("./ptmod");
var fs = require("fs");
var _ = require("lodash");

const MAX_PERIOD=907;
const MIN_PERIOD=108;

const SLIDING_WINDOW_SIZE = 30000;

if (process.argv.length<3) {
	console.error("Usage: node",process.argv[1],"<mod_filename>");
	process.exit(1);
}

var inFileName = process.argv[2];

console.log("Loading file:",inFileName);

fs.readFile(inFileName, onFileLoaded);

var vibratoTable = [
	   0,  24,  49,  74,  97, 120, 141, 161,
	 180, 197, 212, 224, 235, 244, 250, 253,
	 255, 253, 250, 244, 235, 224, 212, 197,
	 180, 161, 141, 120,  97,  74,  49,  24,
	   0, -24,  49,  74,  97, 120, 141, 161,
	-180,-197,-212,-224,-235,-244,-250,-253,
	-255,-253,-250,-244,-235,-224,-212,-197,
	-180,-161,-141,-120,- 97,- 74,- 49,- 24	 
];

function onFileLoaded(err, data) {
	if (err) {
		console.log(err.message);
		process.exit(1);
	}
	console.log("Loaded:",data.length,"bytes");

	var mod = new Module(data);

	console.log("Original pattern data length",mod.patterns.length*1024,"bytes");

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

	var vBlankSpeed=6;
	var ticks=0;

	var noteTriggerData=[[],[],[],[]];
	var instrumentData=[[],[],[],[]];
	var volumeData=[[],[],[],[]];
	var periodData=[[],[],[],[]];

	var trackInstrumentNumber=[0,0,0,0];
	var trackVolume=[0,0,0,0];
	var trackPeriod=[0,0,0,0];
	var targetPeriod=[0,0,0,0];
	var portamentoSpeed=[0,0,0,0];
	var trackVibrato=[{speed:0,depth:0,position:0},{speed:0,depth:0,position:0},{speed:0,depth:0,position:0},{speed:0,depth:0,position:0}];

	for (var p=0;p<mod.sequence.length;p++) {	
		
		var nextP = p+1;

		for (var r=0;r<64;r++) {

			var patternBreak = false;
			var startRow = 0;

			// pick up speed first
			for (var t=0;t<4;t++) {
				// read row
				var row = mod.sequence[p].tracks[t][r];

				switch (row.command) {
					case 0xF:
						if (row.parameter < 0x20) {
							//console.info("vblank tempo set to:",mod.sequence[p].tracks[t][r].parameter);
							vBlankSpeed = row.parameter;
						}
						else {
							//console.info("ignoring bpm tempo:",row.parameter);
						}
						break;
					case 0xD:
						patternBreak = true;
						startRow = ((row.parameter & 0xF0) >>> 4) * 10 + (row.parameter & 0x0F);
						if (startRow > 63) {
							console.info("Ignoring invalid pattern break line number:", startRow, "in song position", p);
							startRow = 0;
						}
						break;
					case 0xB:
						patternBreak = true;
						startRow = 0;
						nextP = row.parameter;
						break;
				}
			}

			// note trigger & instrument data
			for (var t=0;t<4;t++) {
				// read row
				var row =mod.sequence[p].tracks[t][r];

				var instrumentChange = false;

				if ((row.instrument!=0) && (row.instrument!=trackInstrumentNumber[t])) {
					trackInstrumentNumber[t] = row.instrument;
					instrumentChange = true;
				}

				if (row.note != 0) {
					switch (row.command) {
						case 0x3:
						case 0x5:
							noteTriggerData[t].push.apply(noteTriggerData[t],_.times(vBlankSpeed, _.constant(false)));
							instrumentData[t].push(instrumentChange ? trackInstrumentNumber[t] : 0);
							instrumentData[t].push.apply(instrumentData[t],_.times(Math.max(0,vBlankSpeed-1), _.constant(0)));
							break;
						case 0xE:
							switch ((row.parameter & 0xF0) >>> 4) {
								case 0xD:
									var delay = row.parameter & 0x0F;
									noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.min(delay,vBlankSpeed), _.constant(false)));
									instrumentData[t].push.apply(instrumentData[t],_.times(Math.min(delay,vBlankSpeed), _.constant(0)));
									if (delay<vBlankSpeed) {
										noteTriggerData[t].push(true);
										instrumentData[t].push(trackInstrumentNumber[t]);
									}
									noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.max(0,vBlankSpeed-delay-1), _.constant(false)));
									instrumentData[t].push.apply(instrumentData[t],_.times(Math.min(0,vBlankSpeed-delay-1), _.constant(0)));
									break;
								case 0x9:
									var delay = row.parameter & 0x0F;
									for (var step=0;step<vBlankSpeed/delay;step++) {
											noteTriggerData[t].push(true);
											instrumentData[t].push(trackInstrumentNumber[t]);
											noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.min(delay-1,vBlankSpeed-step*delay-1), _.constant(false)));
											instrumentData[t].push.apply(instrumentData[t],_.times(Math.min(delay-1,vBlankSpeed-step*delay-1), _.constant(0)));
									}
								default:
									noteTriggerData[t].push(true);
									instrumentData[t].push(trackInstrumentNumber[t]);
									noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.max(0,vBlankSpeed-1), _.constant(false)));
									instrumentData[t].push.apply(instrumentData[t],_.times(Math.max(0,vBlankSpeed-1), _.constant(0)));
							}
							break;
						default:
							noteTriggerData[t].push(true);
							instrumentData[t].push(trackInstrumentNumber[t]);
							noteTriggerData[t].push.apply(noteTriggerData[t],_.times(Math.max(0,vBlankSpeed-1), _.constant(false)));
							instrumentData[t].push.apply(instrumentData[t],_.times(Math.max(0,vBlankSpeed-1), _.constant(0)));
					}
				}
				// no new note
				else {
					noteTriggerData[t].push.apply(noteTriggerData[t],_.times(vBlankSpeed, _.constant(0)));
					instrumentData[t].push(instrumentChange ? trackInstrumentNumber[t] : 0);
					instrumentData[t].push.apply(instrumentData[t],_.times(Math.max(0,vBlankSpeed-1), _.constant(0)));					
				}
			}

			// period data
			for (var t=0;t<4;t++) {

				var row =mod.sequence[p].tracks[t][r];

				if (row.note != 0) {
					if ((row.command == 0x3) || (row.command == 0x5)) {
						targetPeriod[t] = row.note;
						// TODO: finetune
					}
					else {
						trackPeriod[t] = row.note;
						// TODO: finetune						
					}
				}

				switch (row.command) {
					// todo: 0, 4 & 6 commands
					case 0x1:
						periodData[t].push(trackPeriod[t]);
						for (var step=0;step<vBlankSpeed-1;step++) {
							trackPeriod[t]-=row.parameter;
							if (trackPeriod[t]<MIN_PERIOD) {
								trackPeriod[t]=MIN_PERIOD;
							}
							periodData[t].push(trackPeriod[t]);
						}
						break;
					case 0x2:
						periodData[t].push(trackPeriod[t]);
						for (var step=0;step<vBlankSpeed-1;step++) {
							trackPeriod[t]+=row.parameter;
							if (trackPeriod[t]>MAX_PERIOD) {
								trackPeriod[t]=MAX_PERIOD;
							}
							periodData[t].push(trackPeriod[t]);
						}					
						break;
					case 0x3:
						portamentoSpeed[t] = row.parameter;
						if (targetPeriod[t] < trackPeriod[t]) {
							portamentoSpeed[t] *= -1;
						}
					case 0x5:
						periodData[t].push(trackPeriod[t]);					
						for (var step=0;step<vBlankSpeed-1;step++) {
							trackPeriod[t]+=portamentoSpeed[t];
							if ((portamentoSpeed[t]<0) && (trackPeriod[t]<targetPeriod[t])) {
								trackPeriod[t] = targetPeriod[t];
							}
							if ((portamentoSpeed[t]>0) && (trackPeriod[t]>targetPeriod[t])) {
								trackPeriod[t] = targetPeriod[t];
							}							
							periodData[t].push(trackPeriod[t]);
						}
						break;
					case 0x4:
						var speed = (row.parameter & 0xF0) >>> 4;
						var depth = row.parameter & 0x0F;

						if (speed!=0) {
							trackVibrato[t].speed = speed;
						}
						if (depth!=0) {
							trackVibrato[t].depth = depth;
						}
						// no break, we do the same thing for 4 and 6 commands
					case 0x6:
						periodData[t].push(trackPeriod[t]);
						for (var step=0;step<vBlankSpeed-1;step++) {
							periodData[t].push(trackPeriod[t] + (vibratoTable[trackVibrato[t].position] * trackVibrato[t].depth / 128));
							trackVibrato[t].position += trackVibrato[t].speed;
							if (trackVibrato[t].position > 63) {
								trackVibrato[t].position -= 64;
							}
						}
						break;
					case 0xE:
						switch ((row.parameter & 0xF0) >>> 4) {
							case 0x1:
								trackPeriod[t]-=row.parameter & 0x0F;
								if (trackPeriod[t]<MIN_PERIOD) {
									trackPeriod[t]=MIN_PERIOD;
								}
								break;
							case 0x2:
								trackPeriod[t]+=row.parameter & 0x0F;
								if (trackPeriod[t]>MAX_PERIOD) {
									trackPeriod[t]=MAX_PERIOD;
								}
								break;
						}
					default:
						periodData[t].push.apply(periodData[t],_.times(vBlankSpeed, _.constant(trackPeriod[t])));	
				}
			}

			// volume data
			for (var t=0;t<4;t++) {

				var row =mod.sequence[p].tracks[t][r];

				if ((row.instrument!=0) ) {
					trackVolume[t] = mod.instruments[row.instrument-1].volume;
					instrumentChange = true;
				}

				switch (row.command) {
					// todo: 7 command
					case 0x5:
					case 0x6:
					case 0xA:
						var volumeDelta = ((row.parameter & 0xF0) >>> 4) - (row.parameter & 0x0F);
						volumeData[t].push(trackVolume[t]);
						for (var step=0;step<vBlankSpeed-1;step++) {
							trackVolume[t]+=volumeDelta;
							if (trackVolume[t]<0) {
								trackVolume[t]=0;
							}
							if (trackVolume[t]>64) {
								trackVolume[t]=64;
							}						
							volumeData[t].push(trackVolume[t]);	
						}
						break;
					case 0xE:
						switch ((row.parameter & 0xF0) >>> 4) {
							case 0xA:
								trackVolume[t]+=row.parameter & 0x0F;
								if (trackVolume[t]>64) {
									trackVolume[t]=64;
								}
								volumeData[t].push.apply(volumeData[t],_.times(vBlankSpeed,trackVolume[t]));
								break;
							case 0xB:
								trackVolume[t]-=row.parameter & 0x0F;
								if (trackVolume[t]<0) {
									trackVolume[t]=0;
								}
								volumeData[t].push.apply(volumeData[t],_.times(vBlankSpeed,trackVolume[t]));
								break;							
							case 0xC:
								var delay = row.parameter & 0x0F;
								volumeData[t].push.apply(volumeData[t],_.times(Math.min(delay,vBlankSpeed), _.constant(trackVolume[t])));
								if (delay<vBlankSpeed) {
									trackVolume[t]=0;
									volumeData[t].push.apply(volumeData[t],_.times(Math.max(0,vBlankSpeed-delay), _.constant(trackVolume[t])));
								}
								break;
							default:
								volumeData[t].push.apply(volumeData[t],_.times(vBlankSpeed,trackVolume[t]));
						}
						break;
					case 0xC:
						if (row.parameter > 64) {
							console.error("Volume > 64 found!");
							trackVolume[t] = 64;
						}
						else {
							trackVolume[t] = row.parameter;
						}
						// no break for C command, set volume as usual
					default:
						volumeData[t].push.apply(volumeData[t],_.times(vBlankSpeed,_.constant(trackVolume[t])));
				}

			}

			ticks += vBlankSpeed;

			for (var t=0;t<4;t++) {
				if (noteTriggerData[t].length != ticks) {
					console.error("TRIGGER!",mod.sequence[p].tracks[t][r]);
					process.exit(1);
				}
				if (instrumentData[t].length != ticks) {
					console.error("INSTRUMENT!",mod.sequence[p].tracks[t][r]);
					process.exit(1);					
				}
				if (volumeData[t].length != ticks) {
					console.error("VOLUMEN!",mod.sequence[p].tracks[t][r]);					
					process.exit(1);
				}
				if (periodData[t].length != ticks) {
					console.error("AUNT IRMA!",mod.sequence[p].tracks[t][r]);					
					process.exit(1);					
				}
			}

			if (patternBreak) {
				break;
			}
		}
	}

	console.log("\nMusic duration:",ticks,"frames");

	// zip the note trigger, instrument, volume and period data for each channel
	var trackData = [[],[],[],[]];

	var initDma = 0X0000;
	// nove the note trigger data one forward, sp we can set dma stop flag on the previous tick
	for (var t=0;t<4;t++) {
		var el = noteTriggerData[t].shift();
		if (el) {
			initDma |= (0x1 << (3-t)); // the channels go backwards in the replayer ...
		}
		noteTriggerData[t].push(el);
	}


	for (var tick=0;tick<ticks;tick++){
		for (var t=0;t<4;t++) {
			
			var word = 0x00000000;
			word |= ((volumeData[t][tick] << 25) >>> 0);

			if (instrumentData[t][tick]!=0) {
				word |= (0x1 << 24); // new note flag
				if (noteTriggerData[t][tick]) {
					word |= (0x1 << 23); // dma stop flag
				}

				word |= (instrumentData[t][tick] << 10); // instrument table index
				word |= (periodData[t][tick] & 0x03FF); // period
			}

			else {
				if (noteTriggerData[t][tick]) {
					word |= (0x1 << 23); // dma stop flag
				}
				var periodChange = 0;
				if (tick!=0) {
					periodChange = periodData[t][tick] - periodData[t][tick-1];
				}
				if ((periodChange < -128) || (periodChange > 127)) {
					console.error("Invalid period change!");					
					//process.exit(1);	
				}
				word |= (periodChange & 0x00FF)
				// no new note
			}

			trackData[t].push(word);
		}
	}

	var uncompressedTracksSize = 0;

	for (var t=0;t<4;t++) {
		console.log("Track",t,"length:",trackData[t].length*4,"bytes");
		uncompressedTracksSize+=trackData[t].length*4;
	}

	console.log("Uncompressed track data:",uncompressedTracksSize,"bytes\n");

	var compressedTracks = [[],[],[],[]];

	console.log("\nOPTIMAL COMPRESSION REPORT\n--------------------------");
	// try to compress the tracks optimally
	for (var t=0;t<4;t++) {

		var matchSize=0;
		var numMatches=0;

		for (var i=0;i<trackData[t].length;i++) {

			//console.log("i:",i);
			
			var matches = [];
			var matchLength = 0;

			// find initial matches for input token in sliding window
			for (var j=Math.max(0,i-SLIDING_WINDOW_SIZE);j<i;j++) {
				//console.log("j:",j);
				if (trackData[t][j] == trackData[t][i]) {
					matches.push(j);
					matchLength = 1;
				}
			}


			// find the longest one
			do {
				var newMatches = []

				for (var m=0;m<matches.length;m++) {
					if (trackData[t][matches[m]+matchLength] == trackData[t][i+matchLength]) {
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
				matchSize+=matchLength;
				numMatches++;
			}

			else {
				compressedTracks[t].push(trackData[t][i]);
			}
		}


		console.log("Matches:",numMatches,"(avg match length)",matchSize/numMatches);
	}

	var compressedTracksSize = 0;

	for (var t=0;t<4;t++) {
		console.log("Track",t,"compressed length:",compressedTracks[t].length*4,"bytes");
		compressedTracksSize+=compressedTracks[t].length*4;
	}

	console.log("Compressed track data:",compressedTracksSize,"bytes");

	var compressedTracks = [[],[],[],[]];

	console.log("\nBUFFERLESS COMPRESSION REPORT\n-----------------------------");

	// try to compress the tracks bufferless
	for (var t=0;t<4;t++) {

		var matchSize=0;
		var numMatches=0;

		for (var i=0;i<trackData[t].length;i++) {
			// find longest match in compressed data
			var longestMatch = {
				index: 0,
				length: 0
			};

			for (var j=0;j<compressedTracks[t].length;j++) {

				var matchLength = 0;

				while (trackData[t][i+matchLength] === compressedTracks[t][j+matchLength]) {
					matchLength++;
				}

				// also check past the end of compressed data for repeated runs
				if ((matchLength+j) >= compressedTracks.length) {
					while (trackData[t][i+matchLength] === trackData[t][j+matchLength]) {
						matchLength++;
					}
				}

				if (matchLength > longestMatch.length) {

					longestMatch = {
						index: j,
						length: matchLength
					}
				}

			}

			if (longestMatch.length > 1) {

				//console.log("MATCH:",i,":",longestMatch.index,longestMatch.length);

				var controlWord = 0xFFFFFFFF
				compressedTracks[t].push(controlWord);
				i+=longestMatch.length-1;
				matchSize+=longestMatch.length-1;
				numMatches++;
			}

			// no match longer than 1 word, just append the next uncompressed word
			else {
				//console.log("NO MATHC:",i);
				compressedTracks[t].push(trackData[t][i]);
			}
		}

		console.log("Matches:",numMatches,"(avg match length)",matchSize/numMatches);

	}

	var compressedTracksSize = 0;

	for (var t=0;t<4;t++) {
		console.log("Track",t,"compressed length:",compressedTracks[t].length*4,"bytes");
		compressedTracksSize+=compressedTracks[t].length*4;
	}

	console.log("Compressed track data:",compressedTracksSize,"bytes");


	// write file
	var outData = []
	
	for (var t=0;t<4;t++) {
		for (var i=0;i<trackData[t].length;i++) {
			outData.push((trackData[t][i] >> 24) & 0xFF);
			outData.push((trackData[t][i] >> 16) & 0xFF);
			outData.push((trackData[t][i] >> 8) & 0xFF);
			outData.push((trackData[t][i]) & 0xFF);
		}
		outData.push(0xFF);
		outData.push(0xFF);
	}
	outData.push(0xFF);
	outData.push(0xFF);

	// Initial DMACAN value
	outData.push(0x00);
	outData.push(initDma);

	for (var i=0;i<mod.instruments.length;i++) {
		outData.push((mod.instruments[i].offset >> 24) & 0xff);
		outData.push((mod.instruments[i].offset >> 16) & 0xff);
		outData.push((mod.instruments[i].offset >> 8) & 0xff);
		outData.push((mod.instruments[i].offset) & 0xff);	
		
		outData.push(((mod.instruments[i].offset + mod.instruments[i].loop.start) >> 24) & 0xff);
		outData.push(((mod.instruments[i].offset + mod.instruments[i].loop.start) >> 16) & 0xff);
		outData.push(((mod.instruments[i].offset + mod.instruments[i].loop.start) >> 8) & 0xff);
		outData.push(((mod.instruments[i].offset + mod.instruments[i].loop.start)) & 0xff);	

		outData.push((mod.instruments[i].length >> 9) & 0xff);
		outData.push((mod.instruments[i].length >> 1) & 0xff);	
		
		outData.push((mod.instruments[i].loop.length >> 9) & 0xff);
		outData.push((mod.instruments[i].loop.length >> 1) & 0xff);
	}
	outData.push(0xFF);
	outData.push(0xFF);
	outData.push(0xFF);
	outData.push(0xFF);

	fs.writeFile("converted.nmod",Buffer.concat([Buffer.from(outData),mod.sampleData]), (err) => {
		if (err) throw err;
		console.log("The file has been saved!");
	});
}