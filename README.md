# RetroConverter v1.0.0

## What is it?

This is a converter for music files in .MOD format (Amiga Protracker
modules). It converts them to .RCM format meant to be used with the
[Retro Player](https://github.com/juusu/retro-player) playroutine.

It is an universal music format for the Amiga, with a (hopefully)
more flexible and reliable replay code than the original ProTracker
replay routine and variants.

## How do I use this?

You can use this tool either from your webbrowser or from the console.
The browser approach has the advantage that you don't need to install
any additional software, and you can also preview the converted tune
directly in the browser and check for any playback errors immideately!

The console approach might be more useful for coders, as you can make
the conversion a part of your build script, and have the uncoverted
.mod files in your project, which makes updating the music easier.

## Using the web UI:

You have two options:

### Build from source:

* clone this repository
* run: npm install
* run: npm run build
* open dist/index.html in your browser

(You'll need have NodeJS and npm installed on your machine for this to
work)

### Online UI:

Use the prebuilt online version at http://malimedo.com/rc/index.html

This doesn't send your music data to the server, all of the conversion 
happens client-side.

### Download prebuild web UI for offline use

If you'd rather use the web UI offline, head on over to the
[Releases](https://github.com/juusu/retro-convert/releases) page and
download the .zip with the latest version.

## Using from CLI:

You'll also need NodeJS installed to run the converter from CLI. Clone
the repo, and from the project folder run the following command:

node src\index-cli.js <mod_filename>

(where "mod_filename" is the name and path to the .MOD file to be
converted).

There are also some options you can pass to the command:

* --no-compress - Do not compress the track data - will result in very
                  large files, but they might compress better using an
                  .exe cruncher - could be useful for 4K intros or
                  similar
* --no-samples  - Do not save the sample data, can be useful if the
                  sample data will be generated with something like
                  4Klang or Cinter
* --no-sync     - Do not output sync data (8xx and E8x commands)
                  this might result in slightly smaller files if you
                  don't need sync data
* --debug       - Print (a lot of) additional info when compressing the
                  track data (probably not useful exept for debugging)

I'm also panning to find a way to build a standalone version of this
command which won't require NodeJS to run in future versions.
