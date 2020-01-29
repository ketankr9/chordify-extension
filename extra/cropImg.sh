#!/bin/bash
if [ -z "$1" ]; then
	echo "Please use image name present in current dir as first argument";
	exit
fi
echo "Cropping ...."
#convert "$1" -crop 197x380+0+0 /home/ketankr9/bot/chordify-mozilla-extension/extension/chords/"$1";
