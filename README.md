# YouTube Data MCP Server

A Model Context Protocol (MCP) server for extracting YouTube video transcripts and comments. This server provides tools to get transcripts and comments from YouTube videos for analysis and summarization.

## Features

- `getTranscript`: Extract subtitles/transcripts from YouTube videos
- `getVideoInfo`: Get basic information about a YouTube video
- `getReplies`: Fetch comments for YouTube videos (using SerpAPI)
- `getCommentReplies`: Get replies to specific YouTube comments

## Requirements

- Node.js 16+
- TypeScript
- SerpAPI API key (for comments functionality)

## Installation

```bash
# Clone the repository
git clone https://github.com/diasm3/serpapi-youtube-mcp-server.git
cd youtube-data-mcp

# Install dependencies
npm install
```

## Configuration

Create a `.env` file in the root directory with your SerpAPI key:

```
SERPAPI_KEY=your_serpapi_key_here
```

You can get a SerpAPI key by signing up at [SerpAPI](https://serpapi.com/).

## Build and Run

```bash
# Build the project
npm run build

# Run the server
npm start
```

The server will start running and listening for commands via stdin/stdout.

## Using with Claude

To use this MCP server with Claude:

1. Add the server to your Claude configuration file:

```json
{
  "mcpServers": {
    "youtube-data": {
      "command": "npx",
      "args": ["-y","youtube-data-mcp"],
      "env": {
        "SERPAPI_KEY": "your_serpapi_key_here"
      }
    }
  }
}
```

Replace `/path/to/youtube-data-mcp/build/index.js` with the actual path to the built index.js file.

2. Restart Claude to apply the configuration.

3. Now you can ask Claude to:
   - "Get the transcript for this YouTube video: [URL]"
   - "Show me the comments for this YouTube video: [URL]"
   - "Get replies to specific comments"

## API Tools

### getVideoInfo

Retrieve basic information about a YouTube video.

Parameters:

- `url`: YouTube video URL or video ID (required)

Returns:

- `videoId`: The video's ID
- `title`: The video's title
- `viewCount`: Number of views
- `publishDate`: Date when the video was published
- `channelName`: Name of the channel that published the video
- `commentCount`: Number of comments on the video
- `commentsNextPageToken`: Token for fetching comments
- `commentsSortingTokens`: Tokens for different comment sorting options

Example (via Claude):

```
Get information about this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### getTranscript

Extracts transcripts/subtitles from YouTube videos.

Parameters:

- `url`: YouTube video URL or video ID (required)
- `lang`: Language code for transcript (optional, default: 'en')

Example (via Claude):

```
Please get the transcript for this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### getReplies

Retrieves comments from a YouTube video using SerpAPI.

Parameters:

- `url`: YouTube video URL or video ID (required for initial page, optional for pagination)
- `limit`: Maximum number of comments to retrieve (optional, default: 100)
- `sort`: Sort order for comments ('relevance' or 'time', optional, default: 'relevance')
- `pageToken`: Token for pagination from previous response (optional)

Example (via Claude):

```
Show me comments for this YouTube video: https://www.youtube.com/watch?v=dQw4w9WgXcQ
```

### getCommentReplies

Gets replies for a specific YouTube comment.

Parameters:

- `pageToken`: Reply token from a comment to get its replies (required)

This function is typically used programmatically after getting the `repliesToken` from a comment.

## Understanding SerpAPI Integration

This MCP server uses SerpAPI's YouTube Video API to fetch comments. SerpAPI provides a way to scrape YouTube data without directly using YouTube's official API.

Key points about SerpAPI usage:

- The server uses the `youtube_video` engine with the `v` parameter (YouTube video ID)
- Comments are paginated using tokens returned in the API response
- Comment replies are fetched separately using their specific tokens
- API calls are limited by your SerpAPI subscription plan

## Troubleshooting

- If you encounter a 400 Bad Request error, verify your SerpAPI key is valid and properly set in the .env file
- Check the server logs for detailed error messages and debugging information
- For comment-related issues, ensure SerpAPI still supports the YouTube Video API format used

## License

MIT
