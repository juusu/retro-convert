"use strict";

class Compressor {
  static compressLz(trackData, lookbackBufferSize) {
    var compressedTrack = [];
    var matchSize = 0;
    var numMatches = 0;

    for (var i = 0; i < trackData.length; i++) {
      var matches = [];
      var matchLength = 0; // find initial matches for input token in sliding window

      for (var j = Math.max(0, i - lookbackBufferSize); j < i; j++) {
        //console.log("j:",j);
        if (trackData[j] == trackData[i]) {
          matches.push(j);
          matchLength = 1;
        }
      } // find the longest one


      do {
        var newMatches = [];

        for (var m = 0; m < matches.length; m++) {
          if (trackData[matches[m] + matchLength] == trackData[i + matchLength]) {
            newMatches.push(matches[m]);
          }
        }

        if (newMatches.length > 0) {
          matchLength++;
          matches = newMatches;
        }
      } while (newMatches.length > 0);

      if (matchLength > 1) {
        var offset = i - matches[matches.length - 1];
        compressedTrack.push(util.createControlWord(offset, matchLength));
        i += matchLength - 1;
        matchSize += matchLength;
        numMatches++;
      } else {
        compressedTrack.push(trackData[i]);
      }
    }

    console.log("Matches:", numMatches, "(avg match length)", matchSize / numMatches);
    var compressedTracksSize = 0;
    compressedTracksSize += compressedTrack.length * 4;
    console.log("Compressed track data:", compressedTracksSize, "bytes");
    return compressedTrack;
  }

  static decompressLz(compressedTrackData) {
    var decompressedTracks = [];

    for (var i = 0; i < compressedTrackData.length; i++) {
      if (compressedTrackData[i] >>> 30 === 3) {
        var controlWord = util.parseControlWord(compressedTrackData[i]);

        for (var j = 0; j < controlWord.length; j++) {
          decompressedTracks.push(decompressedTracks[decompressedTracks.length - controlWord.offset]);
        }
      } else {
        decompressedTracks.push(compressedTrackData[i]);
      }
    }

    return decompressedTracks;
  }

  static getTrackDataSize(data) {
    return data.length * 4;
  }

  static logDebug(data, maxSize) {
    for (var i = 0; i < maxSize && i < data.length; i++) {
      if (data[i] >>> 30 === 3) {
        var controlWord = util.parseControlWord(data[i]);
        console.log("offset:", controlWord.offset, "length:", controlWord.length);
      } else {
        console.log("data:", data[i]);
      }
    }
  }

}

class util {
  static createControlWord(matchOffset, matchLength) {
    return 0xC0000000 | matchOffset << 15 & 0x3FFF8000 | matchLength & 0x7FFF;
  }

  static parseControlWord(controlWord) {
    var offset = (controlWord & 0x3FFF8000) >>> 15;
    var length = controlWord & 0x7FFF;
    return {
      "offset": offset,
      "length": length
    };
  }

}

module.exports = Compressor;