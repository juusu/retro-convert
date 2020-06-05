const Converter = require("./converter");
const Module = require("./ptmod");

import { saveAs } from 'file-saver';

import Vue from 'vue'
import Paula from 'paulajs'

import html from "../static/index.html"
import font from "../static/mO'sOul_v1.0.ttf"

var app = new Vue({
    el: '#app',
    data: {
        modLoaded: false
    },
    methods: {
        loadMod: function (event) {

            var reader = new FileReader();
            var fileName = event.target.files[0].name;
        
            var songName = fileName.split(".")[0] !== "mod" ? fileName.split(".")[0] : fileName.split(".")[1];
        
            reader.onload = function () {
                var output = Converter.convert(new Module(new Buffer(this.result)), { compress: true, samples: true });
                var blob = new Blob([output], { type: "application/octet-stream" });
                saveAs(blob,songName+".rcm");
            }
            reader.readAsArrayBuffer(event.target.files[0]);
        
        }
    }
}); 