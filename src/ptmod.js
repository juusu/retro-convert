"use strict";

const bufferSplice = require("buffer-splice");

const INSTRUMENT_RECORD_SIZE = 30;

class Module {
    constructor (data) {
        var tag = data.toString("binary", 1080, 1084);

        this.hundredPatterns = false;

        switch (tag) {
        case "M!K!":
            this.hundredPatterns = true;
            break;
        case "M.K.":
            break;
        default:
            console.error("Unknown module fileformat tag:", tag);
            process.exit(1);
        }

        this.title = data.toString("binary", 0, 20).replace(/\0[\s\S]*$/g, "").trim();

        this.instruments = [];

        for (var instrumentNumber = 1; instrumentNumber < 32; instrumentNumber++) {
            var instrument = new Instrument(
                data.slice(
                    (instrumentNumber - 1) * INSTRUMENT_RECORD_SIZE + 20,
                    instrumentNumber * INSTRUMENT_RECORD_SIZE + 20),
                instrumentNumber
            );
            this.instruments.push(instrument);
        }

        var songLength = data.readUInt8(950);

        if (songLength > 128) {
            console.error("Invalid song length", songLength);
            process.exit(1);
        }

        var tempSequence = [];

        var maxPattern = 0;

        for (var p = 0; p < songLength; p++) {
            var patternNumber = data.readUInt8(952 + p);
            tempSequence.push(patternNumber);
            maxPattern = Math.max(patternNumber, maxPattern);
        }

        if (!this.hundredPatterns && maxPattern > 63) {
            console.error("Too many patterns found for M.K. (64 pattern) module:", maxPattern);
        }

        this.patterns = [];

        for (p = 0; p <= maxPattern; p++) {
            var pattern = new Pattern(data.slice(
                1084 + p * 1024, 1084 + (p + 1) * 1024
            ));
            this.patterns.push(pattern);
        }

        this.sequence = [];

        for (var i = 0; i < tempSequence.length; i++) {
            this.sequence.push(this.patterns[tempSequence[i]]);
        }

        this.sampleData = data.slice(1084 + (maxPattern + 1) * 1024);

        if ((maxPattern + 1) * 1024 + this.sampleData.length + 1084 !== data.length) {
            console.error("Invalid file length! (should be", (maxPattern + 1) * 1024 + this.sampleData.length + 1084, "bytes)");
            process.exit(1);
        }

        var offset = 0;

        for (i = 0; i < this.instruments.length; i++) {
            this.instruments[i].offset = offset;
            if (this.instruments[i].length > 0 && this.instruments[i].loop.start === 0 && this.instruments[i].loop.length === 2) {
                var firstWord = this.sampleData.readUInt16BE(offset);
                if (firstWord !== 0) {
                    console.warn("First two bytes of one-shot sample", i + 1, "are not zero, might result in playback artifacts!");
                }
            }

            offset += this.instruments[i].length;
        }

        if (offset !== this.sampleData.length) {
            console.error("Invalid sample data length! (should be", offset, "bytes)");
            process.exit(1);
        }
    }

    killInstrument (num) {
        if (this.instruments[num - 1].number !== num) {
            console.error("Invalid instrument number!");
            process.exit(1);
        }
        var length = this.instruments[num - 1].length;
        var offset = this.instruments[num - 1].offset;

        this.instruments[num - 1].length = 0;
        this.instruments[num - 1].finetune = 0;
        this.instruments[num - 1].volume = 0;
        this.instruments[num - 1].loop = {
            start: 0,
            length: 2
        };

        for (var i = num; i < this.instruments.length; i++) {
            this.instruments[i].offset -= length;
        }

        this.sampleData = bufferSplice(this.sampleData, offset, length);

        return length;
    }
}

class Pattern {
    constructor (data) {
        this.tracks = [[], [], [], []];

        var offset = 0;
        for (var row = 0; row < 64; row++) {
            for (var track = 0; track < 4; track++) {
                var rawTrackRow = data.readUInt32BE(offset, offset + 4);
                var instrumentNumber = (0x10000000 & rawTrackRow) >>> 24 | (0xF000 & rawTrackRow) >>> 12;
                var period = (0xFFF0000 & rawTrackRow) >>> 16;
                var command = (0xF00 & rawTrackRow) >>> 8;
                var parameter = (0xFF & rawTrackRow);
                offset += 4;

                this.tracks[track].push({
                    note: period,
                    instrument: instrumentNumber,
                    command: command,
                    parameter: parameter
                });
            }
        }
    }
}

class Instrument {
    constructor (data, instrumentNumber) {
        this.number = instrumentNumber;
        this.name = data.toString("binary", 0, 22).replace(/\0[\s\S]*$/g, "").trim();
        this.length = data.readUInt16BE(22) * 2;
        this.finetune = data.readUInt8(24);
        if (this.finetune > 15) {
            console.error("Invalid finetune value", this.finetune, "for instrument", this.number);
            process.exit(1);
        }
        this.volume = data.readUInt8(25);
        if (this.volume > 64) {
            console.error("Invalid volume", this.volume, "for instrument", this.number);
            process.exit(1);
        }
        this.loop = {
            start: data.readUInt16BE(26) * 2,
            length: data.readUInt16BE(28) * 2
        };
        if (this.length > 0) {
            if (this.loop.start + this.loop.length > this.length) {
                console.error("Loop past the end of sample for instrument", this.number);
                console.log(this);
                process.exit(1);
            }
        } else {
            if (this.loop.length !== 2 || this.loop.start !== 0) {
                console.error("Invalid loop pointers for empty instrument", this.number);
                console.log(this);
                process.exit(1);
            }
        }
    }
}

module.exports = Module;
