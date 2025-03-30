#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import * as dotenv from "dotenv"
import { z } from "zod"

// 환경 변수 로드
dotenv.config()

// 유틸리티 함수 가져오기
import { getVideoId, fetchBasicVideoInfo } from "./utils/helpers.js"

// YouTube transcript 관련 함수
import { YoutubeTranscript } from "youtube-transcript"

// SerpAPI 관련 설정
const SERPAPI_KEY = process.env.SERPAPI_KEY
const SERPAPI_BASE_URL = "https://serpapi.com/search.json"

// 인터페이스 정의
interface TranscriptParams {
  url: string
  lang?: string
}

interface CommentsParams {
  url: string
  limit?: number
  sort?: "relevance" | "time"
  pageToken?: string // 페이지네이션을 위한 토큰
}

interface RepliesParams {
  pageToken: string // 필수 - 댓글의 replies_next_page_token
}

interface VideoInfoParams {
  url: string
}

interface Comment {
  commentId: string
  author: string
  text: string
  time: string
  likes: number
  replies?: number
  repliesToken?: string | null
}

interface SortingToken {
  title: string
  token: string
}

interface VideoInfoResponse {
  videoId: string
  title?: string
  viewCount?: string
  publishDate?: string
  channelName?: string
  commentCount?: number
  commentsNextPageToken?: string
  commentsSortingTokens?: SortingToken[]
}

// YouTube 기본 비디오 정보 가져오기 함수
async function getVideoInfoData({
  url,
}: VideoInfoParams): Promise<VideoInfoResponse> {
  try {
    // YouTube 동영상 ID 추출
    const videoId = getVideoId(url)
    if (!videoId) {
      throw new Error("Invalid YouTube URL or video ID")
    }

    if (!SERPAPI_KEY) {
      throw new Error("SERPAPI_KEY is not set in environment variables")
    }

    // SerpAPI 요청 준비
    const requestUrl = new URL(SERPAPI_BASE_URL)
    const params = {
      api_key: SERPAPI_KEY,
      engine: "youtube_video",
      v: videoId,
    }

    // 디버깅 정보 - 요청 URL과 파라미터
    console.error("Debug - Video Info Request:", {
      url: requestUrl.toString(),
      params,
    })

    // URL 파라미터 설정
    Object.entries(params).forEach(([key, value]) => {
      requestUrl.searchParams.append(key, value)
    })

    // 요청 보내기
    const headers = {
      "Content-Type": "application/json",
    }

    const response = await fetch(requestUrl.toString(), { headers })

    // 디버깅 정보 - 응답 상태
    console.error("Debug - Response status:", response.status)

    if (!response.ok) {
      // 에러 응답의 본문 가져오기
      const errorText = await response.text()
      console.error("Debug - Error response:", errorText)

      throw new Error(`SerpAPI error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // 디버깅 정보 - 응답 데이터의 키 목록
    console.error("Debug - Response keys:", Object.keys(data))

    // 비디오 정보 추출
    return {
      videoId: videoId,
      title: data.title,
      viewCount: data.views,
      publishDate: data.published_date,
      channelName: data.channel?.name,
      commentCount: data.extracted_comment_count,
      commentsNextPageToken: data.comments_next_page_token,
      commentsSortingTokens: data.comments_sorting_token,
    }
  } catch (error) {
    console.error("Error fetching video info:", error)
    throw error
  }
}

// YouTube 트랜스크립트 가져오기 함수
async function getTranscriptData({ url, lang = "en" }: TranscriptParams) {
  try {
    // YouTube 동영상 ID 추출
    const videoId = getVideoId(url)
    if (!videoId) {
      throw new Error("Invalid YouTube URL or video ID")
    }

    // 비디오 기본 정보 가져오기
    const videoInfo = await fetchBasicVideoInfo(videoId)

    // 트랜스크립트 가져오기
    const transcript = await YoutubeTranscript.fetchTranscript(videoId, {
      lang,
    })

    // 전체 텍스트 구성
    const fullText = transcript.map((segment) => segment.text).join(" ")

    return {
      videoInfo: {
        id: videoId,
        title: videoInfo.title,
        channelName: videoInfo.channelName,
        publishedAt: videoInfo.publishedAt,
        viewCount: videoInfo.viewCount,
      },
      transcript: transcript,
      fullText: fullText,
      language: lang,
    }
  } catch (error) {
    console.error("Error fetching transcript:", error)
    throw error
  }
}

// YouTube 댓글 가져오기 함수
async function getCommentsData({
  url,
  limit = 100,
  sort = "relevance",
  pageToken,
}: CommentsParams) {
  try {
    if (!SERPAPI_KEY) {
      throw new Error("SERPAPI_KEY is not set in environment variables")
    }

    let requestUrl: URL
    let params: Record<string, string> = {}
    let extractedVideoId: string = ""

    // 디버깅 정보
    console.error("Debug - CommentsParams:", { url, limit, sort, pageToken })

    if (pageToken) {
      // 페이지 토큰이 제공된 경우 - 다음 페이지 요청
      requestUrl = new URL(SERPAPI_BASE_URL)
      params = {
        api_key: SERPAPI_KEY,
        engine: "youtube_video",
        next_page_token: pageToken,
      }
    } else {
      // URL로 먼저 비디오 정보 요청
      const possibleVideoId = getVideoId(url)
      if (!possibleVideoId) {
        throw new Error("Invalid YouTube URL or video ID")
      }
      extractedVideoId = possibleVideoId

      // 비디오 정보를 가져와서 기본 댓글 토큰 획득
      const videoInfo = await getVideoInfoData({ url })

      // 정렬 방식에 따라 적절한 토큰 선택
      let tokenToUse = videoInfo.commentsNextPageToken

      if (sort === "time" && videoInfo.commentsSortingTokens) {
        // 'Newest first' 토큰 찾기
        const newestFirstToken = videoInfo.commentsSortingTokens.find((token) =>
          token.title.toLowerCase().includes("newest")
        )

        if (newestFirstToken) {
          tokenToUse = newestFirstToken.token
        }
      }

      if (!tokenToUse) {
        throw new Error("Could not find valid comments token")
      }

      requestUrl = new URL(SERPAPI_BASE_URL)
      params = {
        api_key: SERPAPI_KEY,
        engine: "youtube_video",
        next_page_token: tokenToUse,
      }

      // 추가 정보 저장
      extractedVideoId = videoInfo.videoId
    }

    // 디버깅 정보 - 요청 URL과 파라미터
    console.error("Debug - Request:", {
      url: requestUrl.toString(),
      params,
    })

    // URL 파라미터 설정
    Object.entries(params).forEach(([key, value]) => {
      requestUrl.searchParams.append(key, value)
    })

    // API 요청 준비
    const headers = {
      "Content-Type": "application/json",
    }

    // 요청 보내기
    const response = await fetch(requestUrl.toString(), { headers })

    // 디버깅 정보 - 응답 상태
    console.error("Debug - Response status:", response.status)

    if (!response.ok) {
      // 에러 응답의 본문 가져오기 (상세 오류 메시지 확인용)
      const errorText = await response.text()
      console.error("Debug - Error response:", errorText)

      throw new Error(`SerpAPI error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // 디버깅 정보 - 응답 데이터의 키 목록
    console.error("Debug - Response keys:", Object.keys(data))

    // 비디오 정보 추출
    const videoId = data.video_id || extractedVideoId
    const videoTitle = data.title

    // 다음 페이지 토큰
    const nextPageToken = data.comments_next_page_token || undefined

    // 댓글 목록이 없는 경우
    if (!data.comments || !Array.isArray(data.comments)) {
      return {
        videoId,
        videoTitle,
        comments: [],
        commentCount: 0,
        nextPageToken,
      }
    }

    // 댓글 파싱
    const comments = data.comments.slice(0, limit).map((comment: any) => ({
      commentId: comment.comment_id || "",
      author: comment.channel?.name || "Anonymous",
      text: comment.content || "",
      time: comment.published_date || "",
      likes: comment.extracted_vote_count || 0,
      replies: comment.replies_count || 0,
      repliesToken: comment.replies_next_page_token || null,
    }))

    return {
      videoId,
      videoTitle,
      comments,
      commentCount: comments.length,
      nextPageToken,
    }
  } catch (error) {
    console.error("Error fetching comments:", error)
    throw error
  }
}

// 특정 댓글의 답글을 가져오는 함수
async function getRepliesData({ pageToken }: RepliesParams) {
  try {
    if (!SERPAPI_KEY) {
      throw new Error("SERPAPI_KEY is not set in environment variables")
    }

    // 디버깅 정보
    console.error("Debug - RepliesParams:", { pageToken })

    const requestUrl = new URL(SERPAPI_BASE_URL)
    requestUrl.searchParams.append("api_key", SERPAPI_KEY)
    requestUrl.searchParams.append("engine", "youtube_video")
    requestUrl.searchParams.append("next_page_token", pageToken)

    // 디버깅 정보 - 요청 URL
    console.error("Debug - Request URL:", requestUrl.toString())

    // 답글 요청
    const headers = {
      "Content-Type": "application/json",
    }

    const response = await fetch(requestUrl.toString(), { headers })

    // 디버깅 정보 - 응답 상태
    console.error("Debug - Response status:", response.status)

    if (!response.ok) {
      // 에러 응답의 본문 가져오기
      const errorText = await response.text()
      console.error("Debug - Error response:", errorText)

      throw new Error(`SerpAPI error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()

    // 디버깅 정보 - 응답 데이터의 키 목록
    console.error("Debug - Response keys:", Object.keys(data))

    // 부모 댓글 ID
    const parentCommentId = data.comment_parent_id || ""

    // 페이지네이션 토큰
    const nextPageToken = data.replies_next_page_token || undefined

    // 답글 목록이 없는 경우
    if (!data.replies || !Array.isArray(data.replies)) {
      return {
        parentCommentId,
        replies: [],
        replyCount: 0,
        nextPageToken,
      }
    }

    // 답글 파싱
    const replies = data.replies.map((reply: any) => ({
      commentId: reply.comment_id || "",
      author: reply.channel?.name || "Anonymous",
      text: reply.content || "",
      time: reply.published_date || "",
      likes: reply.extracted_vote_count || 0,
    }))

    return {
      parentCommentId,
      replies,
      replyCount: replies.length,
      nextPageToken,
    }
  } catch (error) {
    console.error("Error fetching replies:", error)
    throw error
  }
}

// MCP 서버 생성
const server = new McpServer({
  name: "YouTube Data MCP",
  version: "1.0.0",
  description: "Extract YouTube transcripts and comments for analysis",
})

// 트랜스크립트 도구 등록
server.tool(
  "getTranscript",
  "Get transcript/subtitles from a YouTube video",
  {
    url: z.string().describe("YouTube video URL or video ID"),
    lang: z
      .string()
      .default("en")
      .describe('Language code for transcript (e.g., "en", "ko", "ja")'),
  },
  async ({ url, lang }) => {
    try {
      const result = await getTranscriptData({ url, lang })

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || "Unknown error"}`,
          },
        ],
      }
    }
  }
)

// 비디오 정보 도구 등록
server.tool(
  "getVideoInfo",
  "Get basic information about a YouTube video",
  {
    url: z.string().describe("YouTube video URL or video ID"),
  },
  async ({ url }) => {
    try {
      const result = await getVideoInfoData({ url })

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || "Unknown error"}`,
          },
        ],
      }
    }
  }
)

// 댓글 도구 등록
server.tool(
  "getReplies",
  "Get comments/replies from a YouTube video using SerpAPI",
  {
    url: z.string().optional().describe("YouTube video URL or video ID"),
    limit: z
      .number()
      .default(100)
      .describe("Maximum number of comments to retrieve"),
    sort: z
      .enum(["relevance", "time"])
      .default("relevance")
      .describe("Sort order for comments"),
    pageToken: z
      .string()
      .optional()
      .describe("Token for pagination (from previous response)"),
  },
  async ({ url, limit, sort, pageToken }) => {
    try {
      // url 또는 pageToken 중 하나는 필수
      if (!url && !pageToken) {
        throw new Error("Either url or pageToken must be provided")
      }

      const result = await getCommentsData({
        url: url || "",
        limit,
        sort,
        pageToken,
      })

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || "Unknown error"}`,
          },
        ],
      }
    }
  }
)

// 답글 도구 등록
server.tool(
  "getCommentReplies",
  "Get replies for a specific YouTube comment using SerpAPI",
  {
    pageToken: z
      .string()
      .describe("Reply token from a comment to get its replies"),
  },
  async ({ pageToken }) => {
    try {
      const result = await getRepliesData({ pageToken })

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || "Unknown error"}`,
          },
        ],
      }
    }
  }
)

// 서버 시작
async function main() {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("YouTube Data MCP Server running on stdio")
}

main().catch((error) => {
  console.error("Fatal error in main():", error)
  process.exit(1)
})
