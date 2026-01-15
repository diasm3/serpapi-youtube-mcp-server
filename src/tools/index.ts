import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"
import { getVideoId, createToolResponse, createErrorResponse } from "../utils/helpers.js"
import * as serpapi from "../services/serpapi.js"
import * as youtube from "../services/youtube.js"

export function registerTools(server: McpServer): void {
  server.tool(
    "getTranscript",
    "Extract transcript/subtitles from a YouTube video. Returns full text with video metadata. Supports multiple languages and optional timestamps.",
    {
      url: z.string().describe("YouTube video URL or 11-character video ID"),
      lang: z.string().default("en").describe("Language code (en, ko, ja, es, etc.)"),
      includeTimestamps: z.boolean().default(false).describe("Include start time and duration for each segment"),
    },
    async ({ url, lang, includeTimestamps }) => {
      try {
        const videoId = getVideoId(url)
        if (!videoId) {
          throw new Error("Invalid YouTube URL or video ID")
        }
        const result = includeTimestamps
          ? await youtube.getTranscriptWithTimestamps(videoId, lang)
          : await youtube.getTranscript(videoId, lang)
        return createToolResponse(result)
      } catch (error) {
        return createErrorResponse(error)
      }
    }
  )

  server.tool(
    "getVideoInfo",
    "Get YouTube video metadata: title, views, publish date, channel, comment count, and pagination tokens for comments.",
    {
      url: z.string().describe("YouTube video URL or video ID"),
    },
    async ({ url }) => {
      try {
        const videoId = getVideoId(url)
        if (!videoId) {
          throw new Error("Invalid YouTube URL or video ID")
        }
        const result = await serpapi.getVideoInfo(videoId)
        return createToolResponse(result)
      } catch (error) {
        return createErrorResponse(error)
      }
    }
  )

  server.tool(
    "getComments",
    "Fetch YouTube video comments with pagination. Supports sorting by relevance or time. Use nextPageToken for pagination.",
    {
      url: z.string().optional().describe("YouTube video URL or ID (required for first page)"),
      limit: z.number().default(100).describe("Max comments to return (1-100)"),
      sort: z.enum(["relevance", "time"]).default("relevance").describe("Sort: relevance or time"),
      pageToken: z.string().optional().describe("Pagination token from previous response"),
    },
    async ({ url, limit, sort, pageToken }) => {
      try {
        if (!url && !pageToken) {
          throw new Error("Either url or pageToken required")
        }
        let videoId: string | undefined
        if (url) {
          videoId = getVideoId(url) || undefined
          if (!videoId) {
            throw new Error("Invalid YouTube URL or video ID")
          }
        }
        const result = await serpapi.getComments(videoId, limit, sort, pageToken)
        return createToolResponse(result)
      } catch (error) {
        return createErrorResponse(error)
      }
    }
  )

  server.tool(
    "getCommentReplies",
    "Fetch replies to a specific YouTube comment. Use repliesToken from getComments response.",
    {
      pageToken: z.string().describe("repliesToken from a comment object"),
    },
    async ({ pageToken }) => {
      try {
        const result = await serpapi.getReplies(pageToken)
        return createToolResponse(result)
      } catch (error) {
        return createErrorResponse(error)
      }
    }
  )

  server.tool(
    "searchYoutube",
    "Search YouTube for videos, channels, and playlists. Returns results with thumbnails, views, and channel info.",
    {
      query: z.string().describe("Search query"),
      limit: z.number().default(10).describe("Max results (1-50)"),
      gl: z.string().optional().describe("Country code (us, kr, jp)"),
      hl: z.string().optional().describe("Language code (en, ko, ja)"),
      sp: z.string().optional().describe("Filter parameter for duration/date"),
      pageToken: z.string().optional().describe("Pagination token"),
    },
    async ({ query, limit, gl, hl, sp, pageToken }) => {
      try {
        const result = await serpapi.searchYouTube(query, limit, gl, hl, sp, pageToken)
        return createToolResponse(result)
      } catch (error) {
        return createErrorResponse(error)
      }
    }
  )
}
