# Hearth CLI Client

A command-line interface for the hearth chat platform.

## Installation

The CLI is part of the hearth project. Simply have the project checked out and use:

```bash
npm run cli
```

Or run directly:

```bash
node cli.js
```

## Features

- **Real-time chat**: Connect to thehearth.dev and chat with web users
- **Colored output**: Messages are displayed with timestamps, usernames, and colors
- **@mentions**: Type @username to mention other users
- **Replies**: See threaded replies with visual indicators
- **Whispers**: Send private messages with `/w username message`
- **Location filtering**: Filter chat by geographic region
- **Username persistence**: Your username is saved in `~/.hearth-cli.json`

## Commands

- `/help` - Show available commands
- `/users` - List online users
- `/w <username> <message>` - Send private whisper
- `/location <region>` - Change location filter
- `/quit` - Exit the CLI

## Locations

Available location filters:
- Global (default)
- North America
- Europe
- Asia
- South America
- Africa
- Oceania

## Configuration

The CLI stores your username in `~/.hearth-cli.json` to remember you between sessions.

## Connection

By default, the CLI connects to `https://thehearth.dev`. You can override this with:

```bash
HEARTH_SERVER=http://localhost:3000 node cli.js
```

## Example Session

```
Connecting to hearth...
Server: https://thehearth.dev

✓ Connected
Welcome, swift_coder42!

--- Recent Messages ---
10:30:15 [Global] hearth: welcome swift_coder42, enjoy the vibe
----------------------

Hearth CLI Commands
/help       - Show this help message
/users      - List online users (3 online)
/w <user> <msg> - Send private whisper to user
/location   - Change location filter
/quit       - Exit the CLI

[Global] swift_coder42> hello everyone!
```

## Development

The CLI is implemented in `cli.js` using:
- `socket.io-client` - WebSocket connection
- `readline` - Interactive command-line input
- ANSI colors - Terminal formatting
