"use strict";

const _ = require("lodash");
const Compressor = require("./compressor");

class Rcm {
    
    constructor (data) {

        var offset = 0;

        this.tracks = [];
        this.restartFrom = [];
        this.dmaBits = 0;
        this.instruments = [];
        this.sampleData = null;
        this.multi = 1;
        this.tempo = 125;

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
                    this.restartFrom.push(word);
                    offset+=4;
                    endTrack = true;
                    word = data.readUInt16BE(offset);
                    if (word === 0xffff) {
                        endTracks = true;
                    }
                }
            } while (!endTrack);

            track = Compressor.decompressLz(track);

            this.tracks.push(track);

        } while (!endTracks);

        // this.tracks = _.zip.apply(_, this.tracks);

        offset += 2;
        this.dmaBits = data.readUInt16BE(offset);
        offset += 2;

        this.multi = data.readUInt8(offset) + 1;
        offset += 1;
        this.tempo = data.readUInt8(offset);
        offset += 1;

        word = data.readUInt16BE(offset);

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

            this.instruments.push({
                sampleStart: sampleStart,
                loopStart: loopStart,
                sampleLength: sampleLength,
                loopLength: loopLength
            })
        }

        offset += 2;
        
        // skip over the decompression buffer sizes
        offset += (this.tracks.length * 2);

        this.sampleData = data.buffer.slice(offset);
    }
}

module.exports = Rcm;