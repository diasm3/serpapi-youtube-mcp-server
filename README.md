# YouTube Data MCP Server

A Model Context Protocol (MCP) server for extracting YouTube video transcripts, comments, and search results. Supports both **Stdio** and **StreamableHTTP** transports.

## Features

- `getTranscript` - Extract subtitles/transcripts with optional timestamps
- `getVideoInfo` - Get video metadata (title, views, comments count)
- `getComments` - Fetch comments with pagination and sorting
- `getCommentReplies` - Get replies to specific comments
- `searchYoutube` - Search videos, channels, and playlists

## What's New in v2.0

- **Dual Transport**: Stdio (default) + StreamableHTTP for web integration
- **Reliable Transcripts**: Replaced `youtube-transcript` with `youtube-caption-extractor` (bot detection bypass, serverless support)
- **Timestamp Support**: Optional start time and duration for each transcript segment
- **Modular Architecture**: Clean separation of concerns (config, types, services, tools)
- **MCP SDK v1.25.2**: Latest SDK with improved stability

## Requirements

- Node.js 18+
- SerpAPI key (for search, comments, video info)

## Installation

```bash
git clone https://github.com/diasm3/serpapi-youtube-mcp-server.git
cd serpapi-youtube-mcp-server
npm install
```

## Configuration

Create a `.env` file:

```
SERPAPI_KEY=your_serpapi_key_here
PORT=3000  # optional, for HTTP mode
```

Get your SerpAPI key at [serpapi.com](https://serpapi.com/).

## Running the Server

```bash
# Build
npm run build

# Stdio mode (default) - for Claude Desktop, Cursor, etc.
npm start

# HTTP mode - for web applications
npm start -- --http
# or
MCP_TRANSPORT=http npm start
```

### HTTP Endpoints

When running in HTTP mode:

- `GET /health` - Health check
- `POST /mcp` - MCP request handler

## MCP Client Configuration

### Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "youtube-data": {
      "command": "node",
      "args": ["/path/to/serpapi-youtube-mcp-server/build/index.js"],
      "env": {
        "SERPAPI_KEY": "your_serpapi_key_here"
      }
    }
  }
}
```

### Using npx

```json
{
  "mcpServers": {
    "youtube-data": {
      "command": "npx",
      "args": ["-y", "youtube-data-mcp"],
      "env": {
        "SERPAPI_KEY": "your_serpapi_key_here"
      }
    }
  }
}
```

## API Tools

### getTranscript

Extract transcript/subtitles from a YouTube video.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | YouTube URL or video ID |
| `lang` | string | No | Language code (default: 'en') |
| `includeTimestamps` | boolean | No | Include start/duration per segment |

```
Get the Korean transcript for https://youtube.com/watch?v=xxxxx with timestamps
```

### getVideoInfo

Get video metadata using SerpAPI.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Yes | YouTube URL or video ID |

Returns: title, views, publish date, channel, comment count, pagination tokens

### getComments

Fetch video comments with pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `url` | string | Conditional | Required for first page |
| `limit` | number | No | Max comments (default: 100) |
| `sort` | string | No | 'relevance' or 'time' |
| `pageToken` | string | No | For pagination |

### getCommentReplies

Get replies to a specific comment.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageToken` | string | Yes | `repliesToken` from comment |

### searchYoutube

Search YouTube for videos, channels, playlists.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query |
| `limit` | number | No | Max results (default: 10) |
| `gl` | string | No | Country code (us, kr, jp) |
| `hl` | string | No | Language code (en, ko, ja) |
| `sp` | string | No | Filter parameter |
| `pageToken` | string | No | For pagination |

## Project Structure

```
src/
├── index.ts          # Server entry (Stdio + HTTP)
├── config/           # Environment configuration
├── types/            # Zod schemas + TypeScript types
├── services/
│   ├── serpapi.ts    # SerpAPI integration
│   └── youtube.ts    # Transcript extraction
├── tools/            # MCP tool definitions
└── utils/            # Helper functions
```

## Troubleshooting

### Transcript not available
- Some videos don't have captions enabled
- Try different language codes (en, ko, ja, etc.)
- Auto-generated captions may not be available for all videos

### SerpAPI errors
- Verify your API key is valid
- Check your SerpAPI quota/limits
- Ensure the video is publicly accessible

### HTTP mode not starting
- Check if PORT is already in use
- Verify environment variables are set

## License

MIT
