const Converter = require("./converter");
const Module = require("./ptmod");
const Rcm = require("./rcm");

import { saveAs } from 'file-saver';

import Vue from 'vue'
import { Paula } from 'paulajs'

import html from "../static/index.html"
import font from "../static/mO'sOul_v1.0.ttf"

import FileReader from "./FileReader.vue";

const BUFFER_SIZE = 4096;

var app = new Vue({
    el: '#app',
    data: function() {
        return {
            rcmData: null,
            songName: null,
            rcm: null,
            audioContext: null,
            paulaNode: null,
            paula: null,
            player: {
                playbackPointer: [0,0,0,0],
                period: [0,0,0,0],
                volume: [0,0,0,0],
                sampleStart: [0,0,0,0],
                sampleLength: [0,0,0,0],
                loopStart: [0,0,0,0],
                loopLength: [0,0,0,0],
                dmaBits: 0x00,
                dmaBitsTemp: 0x00,
                playerSection: 0,
                tempo: 125
            }
        }
    },
    computed: {
        modLoaded: function() {
            return this.rcmData ? true : false;
        }
    },
    methods: {
        convertMod: function(e) {
            this.rcmData = Converter.convert(new Module(new Buffer(e.data)), { compress: true, samples: true, sync: true });
            this.songName = e.songName;
        },
        saveRcm: function() {
            saveAs(new Blob([this.rcmData], { type: "application/octet-stream" }),this.songName+".rcm");
        },
        play: function() {
            // convert binary blob to rcm object for playback if not already converted
            if (!this.rcm) { 
                this.rcm = new Rcm(this.rcmData);
                this.player.dmaBits = this.rcm.dmaBits; 
                this.player.tempo = this.rcm.tempo;
            }
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }
            if (!this.paulaNode) {
                this.paulaNode = this.audioContext.createScriptProcessor(BUFFER_SIZE,0,1);
            }
            if (!this.paula) {
                this.paula = new Paula(this.audioContext.sampleRate,this.rcm.sampleData);
            }

            // callbacks execute in different scope and won't see the vue instance as "this"
            var vm = this;

            this.paula.ciaTimerInterval = 362;
            this.paula.CIATA = 362;

            this.paula.ciaTimerCallBack = function() {
                
                // player logical flow
                // rc_Music1:
                // * stop DMA for selected channels (read from player state)
                // * read note
                // * extract volume to channel state
                // * check note dma flag, should we stop dma for this channel? (store in channel state, but keep previous value in temp area)
                // * check new note flag
                // +---* new note: * extract instrument number
                // |               +---* >0: * subtract 1 from instrument number
                // |               |         * copy pointers from instrument table to channel state
                // |               |         * fall through and update period
                // |               +---* copy period to channel state
                // +---* no new note: * extract sample loop offset
                //                    +---* != 0: * add offset to loop ptr in channel state
                //                    * extract period delta
                //                    +---* != 0: * add period delta to period in channel state
                // rc_Music2:
                // * get DMA bits from temp area
                // * if dma bit, poke sample start and sample length from channel state to paula
                // * poke volume and period to paula
                // * re-enable audio DMA
                // rc_Music3:
                // * re-poke loop start and length for all channels

                switch (vm.player.playerSection) {
                    case 0:

                        vm.paula.CIATA = 110;

                        vm.player.dmaBitsTemp = vm.player.dmaBits;
                        vm.player.dmaBits = 0;

                        for (var track = 0; track < vm.rcm.tracks.length; track++) {

                            // check if we need to disable DMA for channel
                            if ((vm.player.dmaBitsTemp >> (3-track)) & 0x01) {
                                vm.paula.channel[track].EN = false;
                            }
                            // decode the word 
                            // and process commands if there are any
                            do {
                                var isCommand = false;
                                var word = vm.rcm.tracks[track][vm.player.playbackPointer[track]];

                                if ((word >>> 30) === 3) {
                                    
                                    isCommand = true;
                                    vm.player.playbackPointer[track]++;

                                    var command = (word >>> 12) & 0x7;
                                    var parameter = word & 0xfff;

                                    switch (command) {
                                        case 0:
                                            var multiplier = (parameter >>> 8) & 0xf;
                                            var tempo = parameter & 0xff;
                                            vm.player.tempo = tempo * (multiplier + 1);
                                            // set tempo
                                            break;
                                        case 1:
                                            // set led filter (not implemented in web player)
                                            break;
                                        case 2:
                                            // sync data (not implemented in web player)
                                            break;
                                    }
                                }
                            } while (isCommand); // keep processing commands until next note

                            vm.player.volume[track] = (word >>> 25) & 0x007F

                            var dmaStopFlag = (word >>> 23) & 0x0001;

                            if (dmaStopFlag) {
                                vm.player.dmaBits |= (1 << (3-track));
                            }

                            var newNoteFlag = (word >>> 24) & 0x0001

                            if (newNoteFlag) {
                                var instrumentNumber = (word >>> 10) & 0x1fff;

                                if (instrumentNumber > 0) {
                                    vm.player.sampleStart[track] = vm.rcm.instruments[instrumentNumber-1].sampleStart;
                                    vm.player.sampleLength[track] = vm.rcm.instruments[instrumentNumber-1].sampleLength;
                                    vm.player.loopStart[track] = vm.rcm.instruments[instrumentNumber-1].loopStart;
                                    vm.player.loopLength[track] = vm.rcm.instruments[instrumentNumber-1].loopLength;
                                }

                                vm.player.period[track] = word & 0x3FF;
                            }
                            else {
                                var periodOffset = word & 0xFF;
                                if (periodOffset > 127) { 
                                    periodOffset = periodOffset - 256; 
                                }
                                vm.player.period[track] += periodOffset;

                                var loopOffset = (word >>> 8) & 0x7FFF;
                                if (loopOffset > 16383) {
                                    loopOffset = loopOffset - 16384;
                                }
                                vm.player.loopStart[track] += loopOffset;
                            }
                        }
                        vm.player.playerSection = 1;
                        break;

                    case 1:
                        // rc_Music2
                        // disable DMA for channels with new note flags
                        vm.paula.CIATA = Math.floor (1773448 / vm.player.tempo) - (110 + 362);

                        for (var track = 0; track < vm.rcm.tracks.length; track++) {
                            if ((vm.player.dmaBitsTemp >>> (3-track)) & 0x1) {

                                vm.paula.channel[track].LCH = (vm.player.sampleStart[track] >>> 16) & 0xFFFF;
                                vm.paula.channel[track].LCL = vm.player.sampleStart[track] & 0xFFFF;
                                vm.paula.channel[track].LEN = vm.player.sampleLength[track];

                            }

                            vm.paula.channel[track].PER = vm.player.period[track];
                            vm.paula.channel[track].VOL = vm.player.volume[track];

                            if ((vm.player.dmaBitsTemp >>> (3-track)) & 0x1) {
                                vm.paula.channel[track].EN = true;
                            }
                        }
                        vm.player.playerSection = 2;
                        break;

                    case 2:
                        // rc_Music3
                        // re-poke loop pointers
                        vm.paula.CIATA = 362;

                        for (var track = 0; track < vm.rcm.tracks.length; track++) {
                            vm.paula.channel[track].LCH = (vm.player.loopStart[track] >>> 16) & 0xFFFF;
                            vm.paula.channel[track].LCL = vm.player.loopStart[track] & 0xFFFF;
                            vm.paula.channel[track].LEN = vm.player.loopLength[track];

                            vm.player.playbackPointer[track]++;
                        }
                        vm.player.playerSection = 0;
                        break;
                }
            }
            this.paulaNode.onaudioprocess = function (e) {
                var output = e.outputBuffer.getChannelData(0); for (var i=0; i<BUFFER_SIZE; i++) { output[i] = vm.paula.getNextSample(); }
            }
            this.paulaNode.connect(this.audioContext.destination);
        }
    },
    components: {
        FileReader
    }
}); 