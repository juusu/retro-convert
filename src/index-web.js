const Converter = require("./converter");
const Module = require("./ptmod");
const Rcm = require("./rcm");

import { saveAs } from 'file-saver';

import Vue from 'vue'
import Paula from 'paulajs'

import html from "../static/index.html"
import font from "../static/mO'sOul_v1.0.ttf"

import FileReader from "./FileReader.vue";

const BUFFER_SIZE = 1024;

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
                playbackPointer: [0,0,0,0]
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
            this.rcmData = Converter.convert(new Module(new Buffer(e.data)), { compress: true, samples: true });
            this.songName = e.songName;
        },
        saveRcm: function() {
            saveAs(new Blob([this.rcmData], { type: "application/octet-stream" }),this.songName+".rcm");
        },
        play: function() {
            // convert binary blob to rcm object for playback if not already converted
            if (!this.rcm) { 
                this.rcm = new Rcm(this.rcmData);
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
            this.paula.vBlankCallBack = function() {
                for (var track = 0; track < this.rcm.tracks.length; track++) {
                    var word = this.rcm.tracks[track][this.player.playbackPointer[track]];
                    console.log(this.player.playbackPointer[track], track, word);
                    this.player.playbackPointer[track]++;
                }
            }
            this.paulaNode.onaudioprocess = function (e) {
                var output = e.outputBuffer.getChannelData(0); for (var i=0; i<BUFFER_SIZE; i++) { output[i] = paula.getNextSample(); }
            }
            this.paulaNode.connect(this.audioContext.destination);

            console.log(this.rcm);
        }
    },
    components: {
        FileReader
    }
}); 