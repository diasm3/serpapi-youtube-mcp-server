import { z } from "zod"

export const VideoUrlSchema = z.object({
  url: z.string().describe("YouTube video URL or video ID"),
})

export const TranscriptInputSchema = {
  url: z.string().describe("YouTube video URL or video ID"),
  lang: z.string().default("en").describe('Language code for transcript (e.g., "en", "ko", "ja")'),
}

export const VideoInfoInputSchema = {
  url: z.string().describe("YouTube video URL or video ID"),
}

export const CommentsInputSchema = {
  url: z.string().optional().describe("YouTube video URL or video ID"),
  limit: z.number().default(100).describe("Maximum number of comments to retrieve"),
  sort: z.enum(["relevance", "time"]).default("relevance").describe("Sort order for comments"),
  pageToken: z.string().optional().describe("Token for pagination (from previous response)"),
}

export const RepliesInputSchema = {
  pageToken: z.string().describe("Reply token from a comment to get its replies"),
}

export const SearchInputSchema = {
  query: z.string().describe("Search query for YouTube"),
  limit: z.number().default(10).describe("Maximum number of results to return"),
  gl: z.string().optional().describe("Country code for search results (e.g., 'us', 'kr', 'jp')"),
  hl: z.string().optional().describe("Language code for search results (e.g., 'en', 'ko', 'ja')"),
  sp: z.string().optional().describe("Special parameter for filtering or pagination"),
  pageToken: z.string().optional().describe("Token for pagination from previous response"),
}

export const TranscriptOutputSchema = {
  videoInfo: z.object({
    id: z.string(),
    title: z.string().optional(),
    channelName: z.string().optional(),
    publishedAt: z.string().optional(),
    viewCount: z.string().optional(),
  }),
  fullText: z.string(),
  language: z.string(),
}

export const VideoInfoOutputSchema = {
  videoId: z.string(),
  title: z.string().optional(),
  viewCount: z.string().optional(),
  publishDate: z.string().optional(),
  channelName: z.string().optional(),
  commentCount: z.number().optional(),
  commentsNextPageToken: z.string().optional(),
  commentsSortingTokens: z.array(z.object({
    title: z.string(),
    token: z.string(),
  })).optional(),
}

export const CommentSchema = z.object({
  commentId: z.string(),
  author: z.string(),
  text: z.string(),
  time: z.string(),
  likes: z.number(),
  replies: z.number().optional(),
  repliesToken: z.string().nullable().optional(),
})

export const CommentsOutputSchema = {
  videoId: z.string(),
  videoTitle: z.string().optional(),
  comments: z.array(CommentSchema),
  commentCount: z.number(),
  nextPageToken: z.string().optional(),
}

export const RepliesOutputSchema = {
  parentCommentId: z.string(),
  replies: z.array(z.object({
    commentId: z.string(),
    author: z.string(),
    text: z.string(),
    time: z.string(),
    likes: z.number(),
  })),
  replyCount: z.number(),
  nextPageToken: z.string().optional(),
}

export const SearchOutputSchema = {
  searchMetadata: z.any().optional(),
  searchParameters: z.any().optional(),
  videoResults: z.array(z.any()),
  channelResults: z.array(z.any()).optional(),
  playlistResults: z.array(z.any()).optional(),
  pagination: z.object({
    current: z.number().optional(),
    next: z.string().optional(),
    nextPageToken: z.string().optional(),
  }).optional(),
}

export interface VideoBasicInfo {
  title?: string
  channelName?: string
  publishedAt?: string
  viewCount?: string
}

export interface VideoInfoResponse {
  videoId: string
  title?: string
  viewCount?: string
  publishDate?: string
  channelName?: string
  commentCount?: number
  commentsNextPageToken?: string
  commentsSortingTokens?: SortingToken[]
}

export interface SortingToken {
  title: string
  token: string
}

export interface Comment {
  commentId: string
  author: string
  text: string
  time: string
  likes: number
  replies?: number
  repliesToken?: string | null
}

export interface CommentsResponse {
  videoId: string
  videoTitle?: string
  comments: Comment[]
  commentCount: number
  nextPageToken?: string
}

export interface Reply {
  commentId: string
  author: string
  text: string
  time: string
  likes: number
}

export interface RepliesResponse {
  parentCommentId: string
  replies: Reply[]
  replyCount: number
  nextPageToken?: string
}

export interface TranscriptSegment {
  text: string
  offset: number
  duration: number
}

export interface TranscriptResponse {
  videoInfo: {
    id: string
    title?: string
    channelName?: string
    publishedAt?: string
    viewCount?: string
  }
  fullText: string
  language: string
  transcript?: TranscriptSegment[]
}

export interface SearchResponse {
  searchMetadata?: Record<string, unknown>
  searchParameters?: Record<string, unknown>
  videoResults: Record<string, unknown>[]
  channelResults?: Record<string, unknown>[]
  playlistResults?: Record<string, unknown>[]
  pagination?: {
    current?: number
    next?: string
    nextPageToken?: string
  }
}
