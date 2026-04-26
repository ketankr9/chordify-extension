#!/bin/bash
# Move plists to LaunchAgents
mkdir -p ~/Library/LaunchAgents

cp scripts/com.ketan.chordify-server.plist ~/Library/LaunchAgents/
cp scripts/com.ketan.chord-player.plist ~/Library/LaunchAgents/

# Unload existing ones (if any)
launchctl unload ~/Library/LaunchAgents/com.ketan.chordify-server.plist 2>/dev/null
launchctl unload ~/Library/LaunchAgents/com.ketan.chord-player.plist 2>/dev/null

# Load them
launchctl load ~/Library/LaunchAgents/com.ketan.chordify-server.plist
launchctl load ~/Library/LaunchAgents/com.ketan.chord-player.plist

echo "LaunchAgents loaded. Your servers will now start automatically at login."
echo "You can check status with: launchctl list | grep ketan"
