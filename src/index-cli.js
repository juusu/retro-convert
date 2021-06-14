// TODO:
//
// EEx command (pattern delay)
// 7xx command

"use strict";

const Module = require("./ptmod");
const Converter = require("./converter");
const fs = require("fs");
const _ = require("lodash");
const yargs = require("yargs")
    .option("c", {
        alias: "compress",
        default: true,
        type: "boolean"
    })
    .option("s", {
        alias: "samples",
        default: true,
        type: "boolean"
    })
    .option("y", {
        alias: "sync",
        default: true,
        type: "boolean"
    })
    .option("d", {
        alias: "debug",
        default: false,
        type: "boolean"
    })
    .argv;

if (yargs._.length !== 1) {
    console.error("Usage: node", yargs.$0, "<mod_filename>");
    process.exit(1);
}

var inFileName = yargs._[0];

console.log("Loading file:", inFileName);

fs.readFile(inFileName, onFileLoaded);

function onFileLoaded (err, data) {
    if (err) {
        console.log(err.message);
        process.exit(1);
    }
    console.log("Loaded:", data.length, "bytes");

    var mod = new Module(data);

    var finalBuffer = Converter.convert(mod, yargs, console);

    var fileName = _.find(inFileName.split("."),function(string) { return string != "mod" }).concat(".rcm");

    fs.writeFile(
        _.find(inFileName.split("."),function(string) { return string != "mod" }).concat(".rcm"), 
        finalBuffer, 
        (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
    });
};
