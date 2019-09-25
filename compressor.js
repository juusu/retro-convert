"use strict";

class Compressor {

    static compressLz(trackData, lookbackBufferSize) {

        console.log("\nLZ COMPRESSION REPORT\n--------------------------");
        
        var compressedTracks = [[],[],[],[]];

        // go through each track
        for (var t=0;t<4;t++) {
    
            var matchSize=0;
            var numMatches=0;
    
            for (var i=0;i<trackData[t].length;i++) {
    
                //console.log("i:",i);
                
                var matches = [];
                var matchLength = 0;
    
                // find initial matches for input token in sliding window
                for (var j=Math.max(0,i-lookbackBufferSize);j<i;j++) {
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
                
                    // DEBUG OUTPUT
                    if (numMatches < 5) {
                        console.log("MATCH @",i,"- offset:",offset,"length:",matchLength)
                    }

                    compressedTracks[t].push(util.createControlWord(offset, matchLength));

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

        return compressedTracks;
    
    }

    static decompressLz(compressedTrackData) {
        var decompressedTracks = [[],[],[],[]];

        for(var t=0;t<4;t++) {
            for (var i=0;i<compressedTrackData[t].length;i++) {
                if (((compressedTrackData[t][i]) >>> 30) === 3) {
                    var controlWord = util.parseControlWord(compressedTrackData[t][i]);
                    for (var j=0;j<controlWord.length;j++) {
                        decompressedTracks[t].push(decompressedTracks[t][decompressedTracks[t].length - controlWord.offset]);
                    }
                }
                else {
                    decompressedTracks[t].push(compressedTrackData[t][i]);
                }
            }
        }

        return decompressedTracks;
    }

    static compressBufferless(trackData, maxRecursionDepth) {
        var compressedTracks = [[],[],[],[]];

        console.log("\nRECURSIVE COMPRESSION REPORT\n(max recursion depth:",maxRecursionDepth,")\n--------------------------");
    
        // try to compress the tracks optimally
        for (var t=0;t<4;t++) {
    
            var numMatches = 0;
            var totalMatchLength = 0
            var maxRecursionDepth = 0;
    
            for (var i=0;i<trackData[t].length;i++) {
    
                var bestMatchLength = 1;
                var bestMatchOffset = 0;
                var bestMatchRecursionDepth = 0;
    
                for (var j=0;j<compressedTracks[t].length;j++) {
    
                    var readPointer = j;
                    var readOffset = 0;
                    var length = compressedTracks[t].length - j;
                    var repeat = 0;
                
                    var readPointerStack = [];
                    var readOffsetStack = [];
                    var lengthStack = [];
                    var repeatStack = [];
    
                    var matchLength = 0;

                    // only start matching if the first word is equal
                    if (trackData[t][i] === compressedTracks[t][readPointer+readOffset]) {

                        var recursionDepth = 0;
    
                        do {
    
                            matchLength++;
                            readOffset++;
                            
                            // check for control word(s)
                            while (((compressedTracks[t][readPointer+readOffset]) >>> 30) === 3) {
    
                                readPointerStack.push(readPointer);
                                readOffsetStack.push(readOffset);
                                lengthStack.push(length);
                                repeatStack.push(repeat);
    
                                if (readPointerStack.length > recursionDepth) {
                                    recursionDepth = readPointerStack.length;
                                }
    
                                var skip = (compressedTracks[t][readPointer+readOffset] & 0x3FFF8000) >>> 15;
                                length = compressedTracks[t][readPointer+readOffset] & 0x7FFF;
    
                                readPointer = readPointer + readOffset - skip;
                                readOffset = 0;
    
                                var repeat = 0;
    
                                if (skip < length) {
                                    repeat = length / skip;
                                }
                            }
    
                            // read the first word after the control word, too
                            if ((readOffset === length) && (readPointerStack.length > 0)) {
    
                                // end of match, go back one level
                                if (repeat === 0) {
                                    readPointer = readPointerStack.pop();
                                    readOffset = readOffsetStack.pop();
                                    length = lengthStack.pop();
                                    repeat = repeatStack.pop();
                                }
                                // we're in a repeating section, do next iteration
                                else {
                                    repeat--;
                                    readOffset=0;
                                }
                            }
                        } while (trackData[t][i+matchLength] === compressedTracks[t][readPointer+readOffset]);
    
                        // also check past the end of compressed data for repeated runs
                        if (j+matchLength>=compressedTracks[t].length) {
                            while (trackData[t][i+matchLength] === trackData[t][j+matchLength]) {
                                matchLength++;
                            }	
                        }
    
                        if (matchLength >= bestMatchLength) {
                            bestMatchRecursionDepth = recursionDepth;
                            bestMatchLength = matchLength;
                            bestMatchOffset = j;
                        };
                    }
                }	
    
                if (bestMatchLength > 1) {

                    // debug output
                    if (numMatches < 5) {
                        console.log("MATCH @",i,"- offset:",compressedTracks[t].length - bestMatchOffset,"length:",bestMatchLength)
                    }

                    numMatches++;
                    totalMatchLength+=bestMatchLength;
                    if (bestMatchRecursionDepth > maxRecursionDepth) {
                        maxRecursionDepth = bestMatchRecursionDepth;
                    }

                    compressedTracks[t].push(util.createControlWord(compressedTracks[t].length - bestMatchOffset,bestMatchLength));
                    i+=bestMatchLength-1;
                }
                else {
                    compressedTracks[t].push(trackData[t][i]);
                }
            }
    
            console.log("Matches:",numMatches,"(avg match length)",totalMatchLength/numMatches,"max recursion depth:",maxRecursionDepth);
        }
    
        var compressedTracksSize = 0;
    
        for (var t=0;t<4;t++) {
            console.log("Track",t,"compressed length:",compressedTracks[t].length*4,"bytes");
            compressedTracksSize+=compressedTracks[t].length*4;
        }
    
        console.log("Compressed track data:",compressedTracksSize,"bytes");

        return compressedTracks;
    }

    static logDebug(data, maxSize) {
        for (var i=0;i<maxSize && i<data.length;i++) {
            if (((data[i]) >>> 30) === 3) {
                var controlWord = util.parseControlWord(data[i]);
                console.log("offset:",controlWord.offset,"length:",controlWord.length);
            }
            else {
                console.log("data:", data[i]);
            }
        }
    }
}

class util {
    static createControlWord(matchOffset, matchLength) {
        return 0xC0000000 | (matchOffset << 15 & 0x3FFF8000) | (matchLength & 0x7FFF);
    }

    static parseControlWord(controlWord) {
        var offset = (controlWord & 0x3FFF8000) >>> 15;
        var length = controlWord & 0x7FFF;
        
        return {
            "offset": offset,
            "length": length
        }
    }
}

module.exports = Compressor;