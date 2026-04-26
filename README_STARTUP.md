# Chordify Startup Services

These LaunchAgents ensure that the Backend and Frontend servers start automatically when you log in to your MacBook.

## Services Installed

1. **Backend Server**: `com.ketan.chordify-server`
   - Command: `python3 server.py`
   - Port: 5050 (default for server.py)
2. **Chord Player Frontend**: `com.ketan.chord-player`
   - Command: `python3 -m http.server 8082`
   - Port: 8082

## Management Commands

To see the status of these services:
```bash
launchctl list | grep ketan
```

To stop a service:
```bash
launchctl unload ~/Library/LaunchAgents/com.ketan.chordify-server.plist
launchctl unload ~/Library/LaunchAgents/com.ketan.chord-player.plist
```

To start/restart them:
```bash
./scripts/setup_startup.sh
```

## Logs
Logs are saved to:
- `/tmp/com.ketan.chordify-server.err.log`
- `/tmp/com.ketan.chord-player.err.log`
