// TODO:
//
// 7xx command

"use strict";

const Compressor = require("./compressor");
const _ = require("lodash");

class Converter {
	static #MAX_PERIOD = 907;
	static #MIN_PERIOD = 108;

	static #vibratoTable = [
	    0, 24, 49, 74, 97, 120, 141, 161,
	    180, 197, 212, 224, 235, 244, 250, 253,
	    255, 253, 250, 244, 235, 224, 212, 197,
	    180, 161, 141, 120, 97, 74, 49, 24,
	    0, -24, -49, -74, -97, -120, -141, -161,
	    -180, -197, -212, -224, -235, -244, -250, -253,
	    -255, -253, -250, -244, -235, -224, -212, -197,
	    -180, -161, -141, -120, -97, -74, -49, -24
	];

	static #periodTable = [
	    [
	        // ; Tuning 0, Normal
	        856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480, 453,
	        428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240, 226,
	        214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120, 113
	    ],
	    [
	        // ; Tuning 1
	        850, 802, 757, 715, 674, 637, 601, 567, 535, 505, 477, 450,
	        425, 401, 379, 357, 337, 318, 300, 284, 268, 253, 239, 225,
	        213, 201, 189, 179, 169, 159, 150, 142, 134, 126, 119, 113
	    ],
	    [
	        // ; Tuning 2
	        844, 796, 752, 709, 670, 632, 597, 563, 532, 502, 474, 447,
	        422, 398, 376, 355, 335, 316, 298, 282, 266, 251, 237, 224,
	        211, 199, 188, 177, 167, 158, 149, 141, 133, 125, 118, 112
	    ],
	    [
	        // ; Tuning 3
	        838, 791, 746, 704, 665, 628, 592, 559, 528, 498, 470, 444,
	        419, 395, 373, 352, 332, 314, 296, 280, 264, 249, 235, 222,
	        209, 198, 187, 176, 166, 157, 148, 140, 132, 125, 118, 111
	    ],
	    [
	        // ; Tuning 4
	        832, 785, 741, 699, 660, 623, 588, 555, 524, 495, 467, 441,
	        416, 392, 370, 350, 330, 312, 294, 278, 262, 247, 233, 220,
	        208, 196, 185, 175, 165, 156, 147, 139, 131, 124, 117, 110
	    ],
	    [
	        // ; Tuning 5
	        826, 779, 736, 694, 655, 619, 584, 551, 520, 491, 463, 437,
	        413, 390, 368, 347, 328, 309, 292, 276, 260, 245, 232, 219,
	        206, 195, 184, 174, 164, 155, 146, 138, 130, 123, 116, 109
	    ],
	    [
	        // Tuning 6
	        820, 774, 730, 689, 651, 614, 580, 547, 516, 487, 460, 434,
	        410, 387, 365, 345, 325, 307, 290, 274, 258, 244, 230, 217,
	        205, 193, 183, 172, 163, 154, 145, 137, 129, 122, 115, 109
	    ],
	    [
	        // Tuning 7
	        814, 768, 725, 684, 646, 610, 575, 543, 513, 484, 457, 431,
	        407, 384, 363, 342, 323, 305, 288, 272, 256, 242, 228, 216,
	        204, 192, 181, 171, 161, 152, 144, 136, 128, 121, 114, 108
	    ],
	    [
	        // Tuning -8
	        907, 856, 808, 762, 720, 678, 640, 604, 570, 538, 508, 480,
	        453, 428, 404, 381, 360, 339, 320, 302, 285, 269, 254, 240,
	        226, 214, 202, 190, 180, 170, 160, 151, 143, 135, 127, 120
	    ],
	    [
	        // Tuning -7
	        900, 850, 802, 757, 715, 675, 636, 601, 567, 535, 505, 477,
	        450, 425, 401, 379, 357, 337, 318, 300, 284, 268, 253, 238,
	        225, 212, 200, 189, 179, 169, 159, 150, 142, 134, 126, 119
	    ],
	    [
	        // Tuning -6
	        894, 844, 796, 752, 709, 670, 632, 597, 563, 532, 502, 474,
	        447, 422, 398, 376, 355, 335, 316, 298, 282, 266, 251, 237,
	        223, 211, 199, 188, 177, 167, 158, 149, 141, 133, 125, 118
	    ],
	    [
	        // Tuning -5
	        887, 838, 791, 746, 704, 665, 628, 592, 559, 528, 498, 470,
	        444, 419, 395, 373, 352, 332, 314, 296, 280, 264, 249, 235,
	        222, 209, 198, 187, 176, 166, 157, 148, 140, 132, 125, 118
	    ],
	    [
	        // Tuning -4
	        881, 832, 785, 741, 699, 660, 623, 588, 555, 524, 494, 467,
	        441, 416, 392, 370, 350, 330, 312, 294, 278, 262, 247, 233,
	        220, 208, 196, 185, 175, 165, 156, 147, 139, 131, 123, 117
	    ],
	    [
	        // Tuning -3
	        875, 826, 779, 736, 694, 655, 619, 584, 551, 520, 491, 463,
	        437, 413, 390, 368, 347, 328, 309, 292, 276, 260, 245, 232,
	        219, 206, 195, 184, 174, 164, 155, 146, 138, 130, 123, 116
	    ],
	    [
	        // Tuning -2
	        868, 820, 774, 730, 689, 651, 614, 580, 547, 516, 487, 460,
	        434, 410, 387, 365, 345, 325, 307, 290, 274, 258, 244, 230,
	        217, 205, 193, 183, 172, 163, 154, 145, 137, 129, 122, 115
	    ],
	    [
	        // Tuning -1
	        862, 814, 768, 725, 684, 646, 610, 575, 543, 513, 484, 457,
	        431, 407, 384, 363, 342, 323, 305, 288, 272, 256, 242, 228,
	        216, 203, 192, 181, 171, 161, 152, 144, 136, 128, 121, 114
	    ]
	];

	static convert (mod, yargs, logger) {

		var uses = {
			"ciaTempo": false,
			"ciaTempoChange": false
		}

	    logger.log("Original pattern data:", mod.patterns.length * 1024, "bytes");

	    var usedInstruments = new Set();

	    for (var pattern = 0; pattern < mod.patterns.length; pattern++) {
	        for (var track = 0; track < 4; track++) {
	            for (var row = 0; row < 64; row++) {
	                if (mod.patterns[pattern].tracks[track][row].instrument > 0) {
	                    usedInstruments.add(mod.patterns[pattern].tracks[track][row].instrument);
	                }
	            }
	        }
	    }

	    var removedSamples = 0;
	    var sampleBytesSaved = 0;
	    var instrumentMap = [];
	    var currentInstrument = 1;

	    for (var i = 0; i < mod.instruments.length; i++) {
	        if (!usedInstruments.has(mod.instruments[i].number)) {
			    if (mod.instruments[i].length > 0) {
	                sampleBytesSaved += mod.killInstrument(mod.instruments[i].number);
	                removedSamples++;
	            } 
			} else {
	            instrumentMap[i + 1] = currentInstrument++;
	        }
	    }

	    logger.log("\nUnused samples removed:", removedSamples);
	    logger.log("Remaining samples:", usedInstruments.size);
	    logger.log("Sample data saved:", sampleBytesSaved, "bytes");
	    logger.log("Optimized sample data:", mod.sampleData.length, "bytes");

	    var vBlankSpeed = 6;
	    var ticks = 0;

	    var noteTriggerData = [[], [], [], []];
	    var instrumentData = [[], [], [], []];
	    var volumeData = [[], [], [], []];
	    var periodData = [[], [], [], []];

	    var trackInstrumentNumber = [0, 0, 0, 0];
		var originalInstrumentNumber = [0, 0, 0, 0];
	    var trackVolume = [0, 0, 0, 0];
	    var trackPeriod = [0, 0, 0, 0];
	    var targetPeriod = [0, 0, 0, 0];
	    var portamentoSpeed = [0, 0, 0, 0];
		var trackSampleOffset = [0, 0, 0, 0];
	    var trackVibrato = [{ speed: 0, depth: 0, position: 0 }, { speed: 0, depth: 0, position: 0 }, { speed: 0, depth: 0, position: 0 }, { speed: 0, depth: 0, position: 0 }];

	    var offsetInstruments = [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}];

		var syncChannel = [0,0,0,0];
		var syncData = {};

	    var startRow = 0;
	    var nextP = 0;
	    var loopCount = 0;
	    var loopPos = 0;

	    var visitedPositions = new Map();
		var restartTick = 0;
		
		var currentBpm = 125;
		var newBpm = currentBpm;
		var bpm = [];
		var numTempoChanges = 0

	    var endSong = false;

	    for (var p = 0; p < mod.sequence.length; p = nextP) {
	        nextP = p + 1;

	        for (var r = startRow; r < 64; r++) {

				var vBlankMultiplier = 1;

	            var currentPosition = JSON.stringify([p, r, loopCount]);

	            if (patternBreak && visitedPositions.has(currentPosition)) {
	                logger.log("Non-standard restart detected! This mod loops from pattern", p, "row", r, ".");
	                logger.log("Restart from tick:", visitedPositions.get(currentPosition));
	                endSong = true;
	                restartTick = visitedPositions.get(currentPosition);
	                break;
	            } else {
	                visitedPositions.set(currentPosition, ticks);
	            }

	            var patternBreak = false;
	            startRow = 0;

	            // pick up speed first; also pick up sync data
	            for (var t = 0; t < 4; t++) {
	                // read row
	                var row = mod.sequence[p].tracks[t][r];

	                switch (row.command) {
	                case 0xF:
	                    if (row.parameter < 0x20) {
	                        vBlankSpeed = row.parameter;
	                    } else {
							newBpm = row.parameter;
	                    }
						break;
					case 0x8:
						syncData[ticks] = syncData[ticks] || [];
						syncData[ticks].push([syncChannel[t],row.parameter]);
						break;
	                case 0xD:
	                    patternBreak = true;
	                    startRow = ((row.parameter & 0xF0) >>> 4) * 10 + (row.parameter & 0x0F);
	                    if (startRow > 63) {
	                        logger.info("Ignoring invalid pattern break line number:", startRow, "in song position", p);
	                        startRow = 0;
	                    }
	                    break;
	                case 0xB:
	                    patternBreak = true;
	                    startRow = 0;
	                    nextP = row.parameter;
	                    break;
	                case 0xE:
	                    switch ((row.parameter & 0xF0) >>> 4) {
	                    case 0x6:
	                        var count = row.parameter & 0x0F;
	                        // set loop
	                        if (count == 0) {
	                            loopPos = r;
	                        }
	                        // loop back
	                        else {
	                            if (loopCount == 0) {
	                                loopCount = count;
	                                nextP = p;
	                                startRow = loopPos;
	                                patternBreak = true;
	                            } else {
	                                loopCount--;
	                                if (loopCount > 0) {
	                                    nextP = p;
	                                    startRow = loopPos;
	                                    patternBreak = true;
	                                }
	                            }
	                        }
							break;
						case 0x8:
							syncChannel[t] = row.parameter & 0x0F;
							break;
						case 0xE:
							vBlankMultiplier = (row.parameter & 0x0F) + 1;
							break;
	                    }
	                    break;
	                }
				}
				
				if (newBpm !== currentBpm) {
					uses.ciaTempo = true;
					currentBpm = newBpm;
					if (ticks > 0) {
						numTempoChanges++;
					}
				}

				bpm.push.apply(bpm, _.times(vBlankSpeed*vBlankMultiplier, _.constant(currentBpm)));

	            // note trigger & instrument data
	            for (var t = 0; t < 4; t++) {
	                // read row
	                var row = mod.sequence[p].tracks[t][r];

	                var instrumentChange = false;

	                if (row.instrument != 0) {
						if (row.instrument != trackInstrumentNumber[t]) {
							// save original instrument number for later in case of sample offset creates new instruments
							originalInstrumentNumber[t] = row.instrument;
	                    	trackInstrumentNumber[t] = originalInstrumentNumber[t];
	                    	instrumentChange = true;
						}
						trackSampleOffset[t]=0;
	                }

	                if (row.note != 0) {
						
						if (trackSampleOffset[t]>0) {
							Converter.addOffsetInstrument(offsetInstruments, trackInstrumentNumber, originalInstrumentNumber, t, trackSampleOffset, mod, usedInstruments, instrumentMap);
						}

	                    switch (row.command) {
	                    case 0x3:
	                    case 0x5:
	                        noteTriggerData[t].push.apply(noteTriggerData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(false)));
	                        if (vBlankSpeed > 0) {
								instrumentData[t].push(instrumentChange ? trackInstrumentNumber[t] : 0);
							}
							instrumentData[t].push.apply(instrumentData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - 1), _.constant(0)));
							break;
	                    case 0xE:
	                        switch ((row.parameter & 0xF0) >>> 4) {
	                        case 0xD:
	                            var delay = row.parameter & 0x0F;
	                            noteTriggerData[t].push.apply(noteTriggerData[t], _.times(Math.min(delay, vBlankSpeed*vBlankMultiplier), _.constant(false)));
	                            instrumentData[t].push.apply(instrumentData[t], _.times(Math.min(delay, vBlankSpeed*vBlankMultiplier), _.constant(0)));
	                            if (delay < vBlankSpeed) {
	                                noteTriggerData[t].push(true);
	                                instrumentData[t].push(trackInstrumentNumber[t]);
	                            }
	                            noteTriggerData[t].push.apply(noteTriggerData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - delay - 1), _.constant(false)));
	                            instrumentData[t].push.apply(instrumentData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - delay - 1), _.constant(0)));
								break;
	                        case 0x9:
	                            var delay = row.parameter & 0x0F;
	                            for (var step = 0; step < vBlankSpeed / delay; step++) {
	                                noteTriggerData[t].push(true);
	                                instrumentData[t].push(trackInstrumentNumber[t]);
	                                noteTriggerData[t].push.apply(noteTriggerData[t], _.times(Math.min(delay - 1, vBlankSpeed*vBlankMultiplier - step * delay - 1), _.constant(false)));
	                                instrumentData[t].push.apply(instrumentData[t], _.times(Math.min(delay - 1, vBlankSpeed*vBlankMultiplier - step * delay - 1), _.constant(0)));
	                            }
	                            break;
	                        default:
								if (vBlankSpeed > 0) {
	                            	noteTriggerData[t].push(true);
	                            	instrumentData[t].push(trackInstrumentNumber[t]);
								}
	                            noteTriggerData[t].push.apply(noteTriggerData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - 1), _.constant(false)));
	                            instrumentData[t].push.apply(instrumentData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - 1), _.constant(0)));
	                        }
	                        break;
	                    case 0x9:
							trackSampleOffset[t] += row.parameter;

							Converter.addOffsetInstrument(offsetInstruments, trackInstrumentNumber, originalInstrumentNumber, t, trackSampleOffset, mod, usedInstruments, instrumentMap);
	                        
							// no break - fall through the default case for the 9 command, too
	                    default:
							if (vBlankSpeed > 0) {
	                        	noteTriggerData[t].push(true);
	                        	instrumentData[t].push(trackInstrumentNumber[t]);
							}
							noteTriggerData[t].push.apply(noteTriggerData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - 1), _.constant(false)));
	                        instrumentData[t].push.apply(instrumentData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - 1), _.constant(0)));
	                    }
	                }
	                // no new note
	                else {
	                    noteTriggerData[t].push.apply(noteTriggerData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(false)));
	                    if (vBlankSpeed > 0) {
	                        instrumentData[t].push(instrumentChange ? trackInstrumentNumber[t] : 0);
	                    }
	                    instrumentData[t].push.apply(instrumentData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - 1), _.constant(0)));
	                }

					// often exploited PT replay bug - sample offset is added twice,
					// once on new note trigger, and another time whether there's a new note or not
					// https://modarchive.org/forums/index.php?topic=4029.0
					if (row.command === 0x9) {
						trackSampleOffset[t] += row.parameter;
					}
	            }

	            // period data
	            for (var t = 0; t < 4; t++) {
	                var row = mod.sequence[p].tracks[t][r];

	                if (row.note != 0) {
	                    var finetune = mod.instruments[trackInstrumentNumber[t] - 1].finetune;

	                    if ((row.command == 0x3) || (row.command == 0x5)) {
	                        targetPeriod[t] = this.#periodTable[finetune][this.#periodTable[0].indexOf(row.note)];
	                    } else {
	                        trackPeriod[t] = this.#periodTable[finetune][this.#periodTable[0].indexOf(row.note)];
	                    }
	                }

	                switch (row.command) {
	                case 0x0:
	                    if (row.parameter != 0x00) {
	                        var arpOffsets = [
	                            0,
	                            (row.parameter & 0xF0) >>> 4,
	                            row.parameter & 0x0F
	                        ];
	                        for (var step = 0; step < vBlankSpeed*vBlankMultiplier; step++) {
	                            var arpStep = step % 3;
	                            switch (arpStep) {
	                            case 0:
	                                periodData[t].push(trackPeriod[t]);
	                                break;
	                            default:
	                                var finetune = mod.instruments[trackInstrumentNumber[t] - 1].finetune;
									var noteIndex = this.#periodTable[finetune].indexOf(
										this.#periodTable[finetune].find(function (period) { return period <= trackPeriod[t] }) 
									) + arpOffsets[arpStep];
									
									// handle arpeggio wrap like PT
									if (noteIndex > 35) {
										finetune++;
										noteIndex-=36;
									}

	                                periodData[t].push(
	                                    this.#periodTable[finetune][noteIndex]
	                                );
	                            }
	                        }
	                    } else {
	                        periodData[t].push.apply(periodData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(trackPeriod[t])));
	                    }
	                    break;
	                case 0x1:
						if (vBlankSpeed > 0) {
	                    	periodData[t].push(trackPeriod[t]);
						}
	                    for (var step = 0; step < vBlankSpeed*vBlankMultiplier - 1; step++) {
	                        trackPeriod[t] -= row.parameter;
	                        if (trackPeriod[t] < this.#MIN_PERIOD) {
	                            trackPeriod[t] = this.#MIN_PERIOD;
	                        }
	                        periodData[t].push(trackPeriod[t]);
	                    }
	                    break;
	                case 0x2:
						if (vBlankSpeed > 0) {
	                    	periodData[t].push(trackPeriod[t]);
						}
						for (var step = 0; step < vBlankSpeed*vBlankMultiplier - 1; step++) {
	                        trackPeriod[t] += row.parameter;
	                        if (trackPeriod[t] > this.#MAX_PERIOD) {
	                            trackPeriod[t] = this.#MAX_PERIOD;
	                        }
	                        periodData[t].push(trackPeriod[t]);
	                    }
	                    break;
	                case 0x3:
	                    if (row.parameter != 0) {
	                        portamentoSpeed[t] = row.parameter;
	                        if (targetPeriod[t] < trackPeriod[t]) {
	                            portamentoSpeed[t] *= -1;
	                        }
	                    }
	                case 0x5:
						if (vBlankSpeed > 0) {
	                    	periodData[t].push(trackPeriod[t]);
						}
						for (var step = 0; step < vBlankSpeed*vBlankMultiplier - 1; step++) {
	                        trackPeriod[t] += portamentoSpeed[t];
	                        if ((portamentoSpeed[t] < 0) && (trackPeriod[t] < targetPeriod[t])) {
	                            trackPeriod[t] = targetPeriod[t];
	                        }
	                        if ((portamentoSpeed[t] > 0) && (trackPeriod[t] > targetPeriod[t])) {
	                            trackPeriod[t] = targetPeriod[t];
	                        }
	                        periodData[t].push(trackPeriod[t]);
	                    }
	                    break;
	                case 0x4:
	                    var speed = (row.parameter & 0xF0) >>> 4;
	                    var depth = row.parameter & 0x0F;

	                    if (speed != 0) {
	                        trackVibrato[t].speed = speed;
	                    }
	                    if (depth != 0) {
	                        trackVibrato[t].depth = depth;
	                    }
	                    // no break, we do the same thing for 4 and 6 commands
	                case 0x6:
						if (vBlankSpeed > 0) {
	                    	periodData[t].push(trackPeriod[t]);
						}
	                    for (var step = 0; step < vBlankSpeed*vBlankMultiplier - 1; step++) {
	                        periodData[t].push(trackPeriod[t] + Math.floor(this.#vibratoTable[trackVibrato[t].position] * trackVibrato[t].depth / 128));
	                        trackVibrato[t].position += trackVibrato[t].speed;
	                        if (trackVibrato[t].position > 63) {
	                            trackVibrato[t].position -= 64;
	                        }
	                    }
	                    break;
	                case 0xE:
	                    switch ((row.parameter & 0xF0) >>> 4) {
	                    case 0x1:
	                        trackPeriod[t] -= row.parameter & 0x0F;
	                        if (trackPeriod[t] < this.#MIN_PERIOD) {
	                            trackPeriod[t] = this.#MIN_PERIOD;
	                        }
	                        break;
	                    case 0x2:
	                        trackPeriod[t] += row.parameter & 0x0F;
	                        if (trackPeriod[t] > this.#MAX_PERIOD) {
	                            trackPeriod[t] = this.#MAX_PERIOD;
	                        }
	                        break;
	                    }
	                default:
	                    periodData[t].push.apply(periodData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(trackPeriod[t])));
	                }
	            }

	            // volume data
	            for (var t = 0; t < 4; t++) {
	                var row = mod.sequence[p].tracks[t][r];

	                if ((row.instrument != 0)) {
	                    trackVolume[t] = mod.instruments[row.instrument - 1].volume;
	                    instrumentChange = true;
	                }

	                switch (row.command) {
	                // todo: 7 command
	                case 0x5:
	                case 0x6:
	                case 0xA:
	                    var volumeDelta = ((row.parameter & 0xF0) >>> 4) - (row.parameter & 0x0F);
						if (vBlankSpeed > 0) {
							volumeData[t].push(trackVolume[t]);
						}
	                    for (var step = 0; step < vBlankSpeed*vBlankMultiplier - 1; step++) {
	                        trackVolume[t] += volumeDelta;
	                        if (trackVolume[t] < 0) {
	                            trackVolume[t] = 0;
	                        }
	                        if (trackVolume[t] > 64) {
	                            trackVolume[t] = 64;
	                        }
	                        volumeData[t].push(trackVolume[t]);
	                    }
	                    break;
	                case 0xE:
	                    switch ((row.parameter & 0xF0) >>> 4) {
	                    case 0xA:
	                        trackVolume[t] += row.parameter & 0x0F;
	                        if (trackVolume[t] > 64) {
	                            trackVolume[t] = 64;
	                        }
	                        volumeData[t].push.apply(volumeData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(trackVolume[t])));
	                        break;
	                    case 0xB:
	                        trackVolume[t] -= row.parameter & 0x0F;
	                        if (trackVolume[t] < 0) {
	                            trackVolume[t] = 0;
	                        }
	                        volumeData[t].push.apply(volumeData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(trackVolume[t])));
	                        break;
	                    case 0xC:
	                        var delay = row.parameter & 0x0F;
	                        volumeData[t].push.apply(volumeData[t], _.times(Math.min(delay, vBlankSpeed*vBlankMultiplier), _.constant(trackVolume[t])));
	                        if (delay < vBlankSpeed) {
	                            trackVolume[t] = 0;
	                            volumeData[t].push.apply(volumeData[t], _.times(Math.max(0, vBlankSpeed*vBlankMultiplier - delay), _.constant(trackVolume[t])));
	                        }
	                        break;
	                    default:
	                        volumeData[t].push.apply(volumeData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(trackVolume[t])));
	                    }
	                    break;
	                case 0xC:
	                    if (row.parameter > 64) {
	                        logger.error("Volume > 64 found!");
	                        trackVolume[t] = 64;
	                    } else {
	                        trackVolume[t] = row.parameter;
	                    }
	                    // no break for C command, set volume as usual
	                default:
	                    volumeData[t].push.apply(volumeData[t], _.times(vBlankSpeed*vBlankMultiplier, _.constant(trackVolume[t])));
	                }
	            }

	            ticks += vBlankSpeed*vBlankMultiplier;

	            for (var t = 0; t < 4; t++) {
	                if (noteTriggerData[t].length != ticks) {
	                    logger.error("Invalid note trigger data!", mod.sequence[p].tracks[t][r]);
	                    process.exit(1);
	                }
	                if (instrumentData[t].length != ticks) {
	                    logger.error("Invalid instrument data!", mod.sequence[p].tracks[t][r]);
	                    process.exit(1);
	                }
	                if (volumeData[t].length != ticks) {
	                    logger.error("Invalid volume data!", mod.sequence[p].tracks[t][r]);
	                    process.exit(1);
	                }
	                if (periodData[t].length != ticks) {
	                    logger.error("Invalid period data!", mod.sequence[p].tracks[t][r]);
	                    process.exit(1);
	                }
	            }

	            if (patternBreak) {
	                break;
	            }
	        }

	        if (endSong) break;
		}
		
		if (numTempoChanges > 0) {
			uses.ciaTempoChange = true;
			logger.log("\nSong changes CIA tempo!");
		}

	    logger.log("\nMusic duration:", ticks, "frames");
	    logger.log("\nRestart from tick:", restartTick);

	    // zip the note trigger, instrument, volume and period data for each channel
	    var trackData = [[], [], [], []];

	    var initDma = 0X0000;
	    // nove the note trigger data one forward, sp we can set dma stop flag on the previous tick
	    for (var t = 0; t < 4; t++) {
	        var el = noteTriggerData[t].shift();
	        if (el) {
	            initDma |= (0x1 << (3 - t)); // the channels go backwards in the replayer ...
			}
			if (restartTick === 0) {
				noteTriggerData[t].push(el);
			}
			else {
				noteTriggerData[t].push(noteTriggerData[t][restartTick-1]);
			}
	    }

		currentBpm = bpm[0];

	    for (var tick = 0; tick < ticks; tick++) {
	        for (var t = 0; t < 4; t++) {

				// interleave tempo changes in first track
				if ((uses.ciaTempoChange) && (t===0) && (bpm[tick]!==currentBpm)) {
					var controlWord = 0xC0000000; // set control bits, command (set tempo = 0) and multiplier-1
					controlWord |= (bpm[tick] & 0xFF); // set tempo
					trackData[t].push(controlWord);
					currentBpm = bpm[tick];
				}

				// also interleave sync data in first track
				if ((yargs.sync) && (t === 0) && (syncData[tick])) {
					for (var i=0; i<syncData[tick].length; i++) {
						var controlWord = 0xC0002000; // set control bits, command (sync = 2) 
						controlWord |= ((syncData[tick][i][0] << 8) & 0x0F00); // sync channel
						controlWord |= syncData[tick][i][1] & 0xFF; // sync value
						trackData[t].push(controlWord);
					}
				}

	            var word = 0x00000000;
	            word |= ((volumeData[t][tick] << 25) >>> 0);

	            var periodChange = 0;
	            if (tick != 0) {
	                periodChange = periodData[t][tick] - periodData[t][tick - 1];
	            }

	            if ((instrumentData[t][tick] != 0) || ((periodChange < -128) || (periodChange > 127))) {
	                word |= (0x1 << 24); // new note flag
	                if (noteTriggerData[t][tick]) {
	                    word |= (0x1 << 23); // dma stop flag
	                }

	                word |= (instrumentMap[instrumentData[t][tick]] << 10); // instrument table index
	                word |= (periodData[t][tick] & 0x03FF); // period
	            } else {
	                if (noteTriggerData[t][tick]) {
	                    word |= (0x1 << 23); // dma stop flag
	                }

	                if ((periodChange < -128) || (periodChange > 127)) {
	                    logger.error("Invalid period change!");
	                    // process.exit(1);
	                }
	                word |= (periodChange & 0x00FF);
	                // no new note
	            }
	            trackData[t].push(word);
	        }
		}
		
		// if tune changes tempo, reset tempo at end of track 0 to the restart tempo (if needed)
		if (uses.ciaTempoChange && (bpm[restartTick] !== bpm[bpm.length-1])) {
			var controlWord = 0xC0000000; // set control bits, command (set tempo = 0) and multiplier-1
			controlWord |= (bpm[restartTick] & 0xFF); // set tempo
			trackData[0].push(controlWord);
		}

	    var uncompressedTracksSize = 0;

	    for (var t = 0; t < 4; t++) {
	        logger.log("Track", t, "data:", trackData[t].length * 4, "bytes");
	        uncompressedTracksSize += trackData[t].length * 4;
	    }

	    logger.log("Uncompressed track data:", uncompressedTracksSize, "bytes\n");

	    var restartPos = [];

	    if (yargs.compress) {
	        // try to find optimal buffer size for LZ compression
	        // absolute upper bound is the size of original pattern data
	        var compressedTracks = [[], [], [], []];
	        var bufferSizes = [];

			if (!yargs.debug) {
				console.log("Compressing track data ...\n");
			}

	        for (var t = 0; t < 4; t++) {
	            // var slidingWindowSize = mod.patterns.length * 64;
	            var slidingWindowSize = ticks;

				if (yargs.debug) {
	            	logger.log("Absolute upper bound on sliding window size:", slidingWindowSize, "(", slidingWindowSize * 4, "bytes )");
	            	logger.log("\nLZ pass 1\n------");
				}

	            var part1 = Compressor.compressLz(trackData[t].slice(0, restartTick), slidingWindowSize);
	            var part2 = Compressor.compressLz(trackData[t].slice(restartTick), slidingWindowSize);

	            compressedTracks[t] = part1.concat(part2);

	            var decompressedTrack = Compressor.decompressLz(compressedTracks[t]);

	            if (_.isEqual(trackData[t], decompressedTrack)) {
					if (yargs.debug) {
	                	logger.log("OK!");
					}
	            } else {
	                logger.error("\n(De)compression verification error!\n-----------------------------");

	                logger.error("Original data:");
	                Compressor.logDebug(trackData[t], 40);
	                logger.error("Compressed data:");
	                Compressor.logDebug(compressedTracks[t], 40);
	                logger.error("Decompressed data:");
	                Compressor.logDebug(decompressedTrack, 40);
					process.exit(1);
	            }

	            var trackDataSize = Compressor.getTrackDataSize(compressedTracks[t]);
	            var totalSize = trackDataSize + (slidingWindowSize * 4);

				if (yargs.debug) {
					logger.log("Compressed track data size:", trackDataSize, "bytes");
	            	logger.log("Track data + decompression buffer:", totalSize);
				}

	            var slidingWindowSize = Math.floor((slidingWindowSize * 4 - trackDataSize) / 4);

	            if (slidingWindowSize <= 0) {
	                logger.error("ERROR: It's mot possible to compress pattern data to be smaller than the original for this mod!");
	                process.exit(1);
	            }

	            var pass = 2;

	            var upperBound = slidingWindowSize;
	            var lowerBound = 0;

	            do {
					if (yargs.debug) {
	                	logger.log("\nLZ pass", pass, "\n------");
	                	logger.log("Current sliding window size:", lowerBound, "<", slidingWindowSize, "<", upperBound, "(", slidingWindowSize * 16, "bytes )");
					}

	                var part1 = Compressor.compressLz(trackData[t].slice(0, restartTick), slidingWindowSize);
	                var part2 = Compressor.compressLz(trackData[t].slice(restartTick), slidingWindowSize);

	                compressedTracks[t] = part1.concat(part2);

	                var decompressedTrack = Compressor.decompressLz(compressedTracks[t]);

	                if (_.isEqual(trackData[t], decompressedTrack)) {
						if (yargs.debug) {
	                    	logger.log("Compressed data verification OK!");
						}
	                } else {
	                    logger.error("\n(De)compression verification error!\n-----------------------------");

	                    logger.error("Original data:");
	                    Compressor.logDebug(trackData[t], 40);
	                    logger.error("Compressed data:");
	                    Compressor.logDebug(compressedTracks[t], 40);
	                    logger.error("Decompressed data:");
	                    Compressor.logDebug(decompressedTrack, 40);
						process.exit(1);
	                }

	                trackDataSize = Compressor.getTrackDataSize(compressedTracks[t]);

	                var newTotalSize = trackDataSize + (slidingWindowSize * 4);
					if (yargs.debug) {
	                	logger.log("Track data + decompression buffer:", newTotalSize);
					}

	                if (newTotalSize < totalSize) {
						if (yargs.debug) {
	                    	logger.log("Smaller! - trying to reduce buffer further!");
						}
	                    upperBound = slidingWindowSize;
	                    totalSize = newTotalSize;
	                    slidingWindowSize = Math.floor(slidingWindowSize - ((upperBound - lowerBound) / 2));
	                } else {
						if (yargs.debug) {
	                    	logger.log("Larger! - increasing buffer size!");
						}
	                    lowerBound = slidingWindowSize;
	                    slidingWindowSize = Math.floor(slidingWindowSize + ((upperBound - lowerBound) / 2));
	                }

	                pass = pass + 1;
	            } while (upperBound - lowerBound > 1);

				if (yargs.debug) {
					logger.log("\nFinal LZ pass\n------");
					logger.log("Optimal sliding window size is:", upperBound);
				}
	            // compress again with the optimal window size because it might not be the last pass
	            var part1 = Compressor.compressLz(trackData[t].slice(0, restartTick), upperBound);
	            var part2 = Compressor.compressLz(trackData[t].slice(restartTick), upperBound);

	            compressedTracks[t] = part1.concat(part2);

	            restartPos[t] = part1.length;

	            var decompressedTrack = Compressor.decompressLz(compressedTracks[t]);

	            if (_.isEqual(trackData[t], decompressedTrack)) {
					if (yargs.debug) {
	                	logger.log("OK!");
					}
	            } else {
	                logger.error("\n(De)compression verification error!\n-----------------------------");

	                logger.error("Original data:");
	                Compressor.logDebug(trackData[t], 40);
	                logger.error("Compressed data:");
	                Compressor.logDebug(compressedTracks[t], 40);
	                logger.error("Decompressed data:");
	                Compressor.logDebug(decompressedTrack, 40);

					process.exit(1);
	            }

	            trackDataSize = Compressor.getTrackDataSize(compressedTracks[t]);

	            var newTotalSize = trackDataSize + (upperBound * 4);
				if (yargs.debug) {
	            	console.log("Track data + decompression buffer:", newTotalSize,"\n");
				}
	            bufferSizes.push(upperBound);
	        }
	    }

	    // write file
	    var outData = [];

	    if (yargs.compress) {
	        trackData = compressedTracks;
	    }

	    logger.log("REPORT\n------\n");

	    for (var t = 0; t < 4; t++) {
	        logger.log("Track", t, "compressed data:", trackData[t].length * 4, "bytes");
	    }
	    var trackDataLength = trackData[0].length * 4 + trackData[1].length * 4 + trackData[2].length * 4 + trackData[3].length * 4;
	    logger.log("Compressed track data:", trackDataLength, "bytes");

	    var instrumentDataLength = usedInstruments.size * 12;

		var totalBufferLength = 0;

	    for (var t = 0; t < 4; t++) {
			totalBufferLength += bufferSizes[t]*4;
	        logger.log("Track", t, "decompression buffer required:", bufferSizes[t] * 4, "bytes");
	    }

		logger.log("Total decompression buffer required:", totalBufferLength, "bytes");

		logger.log("Instrument data size:", instrumentDataLength, "bytes");

	    var sampleDataLength = mod.sampleData.length;
	    logger.log("Sample data size:", sampleDataLength, "bytes");

	    var metaDataLength = 38;
	    logger.log("Meta data size:", metaDataLength, "bytes");

	    logger.log("Final file size:", trackDataLength + instrumentDataLength + sampleDataLength + metaDataLength, "bytes");

	    var allTracksWordSet = new Set();

	    for (var t = 0; t < 4; t++) {
	        var wordSet = new Set();

	        for (var i = 0; i < trackData[t].length; i++) {
	            outData.push((trackData[t][i] >> 24) & 0xFF);
	            outData.push((trackData[t][i] >> 16) & 0xFF);
	            outData.push((trackData[t][i] >> 8) & 0xFF);
	            outData.push((trackData[t][i]) & 0xFF);

	            wordSet.add(trackData[t][i]);
	            allTracksWordSet.add(trackData[t][i]);
	        }
	        outData.push(0xFF);
	        outData.push(0xFF);

	        // logger.log("Track", t, "has", wordSet.size, "different values.");

	        // restart pointer
	        outData.push((restartPos[t] >> 24) & 0xFF);
	        outData.push((restartPos[t] >> 16) & 0xFF);
	        outData.push((restartPos[t] >> 8) & 0xFF);
	        outData.push(restartPos[t] & 0xFF);
	    }

	    // logger.log("All tracks have", allTracksWordSet.size, "different values.");

	    outData.push(0xFF);
	    outData.push(0xFF);

	    // Initial DMACON value
	    outData.push(0x00);
		outData.push(initDma);
		
		// initial multiplier & tempo
		outData.push(0x00);
		outData.push(bpm[0]);

	    for (var i = 0; i < mod.instruments.length; i++) {
	        if (usedInstruments.has(i + 1)) {
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
	    }

	    outData.push(0xFF);
	    outData.push(0xFF);

	    // add the decompression buffer sizes
	    if (yargs.compress) {
	        for (var t = 0; t < 4; t++) {
	            outData.push((bufferSizes[t] >> 8) & 0xff);
	            outData.push((bufferSizes[t]) & 0xff);
	        }
	    }

	    var finalBuffer;

	    if (yargs.samples) {
	        finalBuffer = Buffer.concat([Buffer.from(outData), mod.sampleData]);
	    } else {
	        finalBuffer = Buffer.from(outData);
	    }

	    return finalBuffer;
	};

	static addOffsetInstrument(offsetInstruments, trackInstrumentNumber, originalInstrumentNumber, t, trackSampleOffset, mod, usedInstruments, instrumentMap) {

		// check if the instrument was already offset
		if (trackInstrumentNumber[t] >= offsetInstruments.length) {
			// find and restore the original instrument number
			trackInstrumentNumber[t] = originalInstrumentNumber[t];
		}

		if (_.isUndefined(offsetInstruments[trackInstrumentNumber[t] - 1][trackSampleOffset[t]])) {
			var offset = trackSampleOffset[t] << 8;
			if (offset < mod.instruments[trackInstrumentNumber[t] - 1].length) {
				mod.instruments.push({
					offset: mod.instruments[trackInstrumentNumber[t] - 1].offset + offset,
					length: mod.instruments[trackInstrumentNumber[t] - 1].length - offset,
					loop: {
						start: mod.instruments[trackInstrumentNumber[t] - 1].loop.start - offset,
						length: mod.instruments[trackInstrumentNumber[t] - 1].loop.length
					},
					finetune: mod.instruments[trackInstrumentNumber[t] - 1].finetune
				});
			}

			// handle sample offset past the end of the samnple
			else {
				mod.instruments.push({
					offset: mod.instruments[trackInstrumentNumber[t] - 1].offset,
					length: 2,
					loop: mod.instruments[trackInstrumentNumber[t] - 1].loop,
					finetune: mod.instruments[trackInstrumentNumber[t] - 1].finetune
				});
			}
			offsetInstruments[trackInstrumentNumber[t] - 1][trackSampleOffset[t]] = mod.instruments.length;
			usedInstruments.add(mod.instruments.length);
			instrumentMap[mod.instruments.length] = usedInstruments.size;
		}
		trackInstrumentNumber[t] = offsetInstruments[trackInstrumentNumber[t] - 1][trackSampleOffset[t]];
	}
}

module.exports = Converter;
