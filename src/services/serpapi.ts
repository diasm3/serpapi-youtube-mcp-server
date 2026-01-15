import { config } from "../config/index.js"
import type {
  VideoInfoResponse,
  CommentsResponse,
  RepliesResponse,
  SearchResponse,
  Comment,
  Reply,
} from "../types/index.js"

async function fetchFromSerpApi(params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = new URL(config.serpApiBaseUrl)
  
  Object.entries({ api_key: config.serpApiKey, ...params }).forEach(([key, value]) => {
    url.searchParams.append(key, value)
  })

  const response = await fetch(url.toString(), {
    headers: { "Content-Type": "application/json" },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`SerpAPI error: ${response.status} - ${errorText}`)
  }

  return response.json() as Promise<Record<string, unknown>>
}

export async function getVideoInfo(videoId: string): Promise<VideoInfoResponse> {
  if (!config.serpApiKey) {
    throw new Error("SERPAPI_KEY is not set in environment variables")
  }

  const data = await fetchFromSerpApi({
    engine: "youtube_video",
    v: videoId,
  })

  const sortingTokens = data.comments_sorting_token as Array<{ title: string; token: string }> | undefined

  return {
    videoId,
    title: data.title as string | undefined,
    viewCount: data.views as string | undefined,
    publishDate: data.published_date as string | undefined,
    channelName: (data.channel as Record<string, unknown>)?.name as string | undefined,
    commentCount: data.extracted_comment_count as number | undefined,
    commentsNextPageToken: data.comments_next_page_token as string | undefined,
    commentsSortingTokens: sortingTokens,
  }
}

export async function getComments(
  videoId: string | undefined,
  limit: number,
  sort: "relevance" | "time",
  pageToken?: string
): Promise<CommentsResponse> {
  if (!config.serpApiKey) {
    throw new Error("SERPAPI_KEY is not set in environment variables")
  }

  let tokenToUse = pageToken
  let extractedVideoId = videoId || ""

  if (!pageToken && videoId) {
    const videoInfo = await getVideoInfo(videoId)
    extractedVideoId = videoInfo.videoId
    tokenToUse = videoInfo.commentsNextPageToken

    if (sort === "time" && videoInfo.commentsSortingTokens) {
      const newestFirstToken = videoInfo.commentsSortingTokens.find((token) =>
        token.title.toLowerCase().includes("newest")
      )
      if (newestFirstToken) {
        tokenToUse = newestFirstToken.token
      }
    }
  }

  if (!tokenToUse) {
    throw new Error("Could not find valid comments token")
  }

  const data = await fetchFromSerpApi({
    engine: "youtube_video",
    next_page_token: tokenToUse,
  })

  const rawComments = data.comments as Array<Record<string, unknown>> | undefined

  if (!rawComments || !Array.isArray(rawComments)) {
    return {
      videoId: extractedVideoId,
      videoTitle: data.title as string | undefined,
      comments: [],
      commentCount: 0,
      nextPageToken: data.comments_next_page_token as string | undefined,
    }
  }

  const comments: Comment[] = rawComments.slice(0, limit).map((comment) => ({
    commentId: (comment.comment_id as string) || "",
    author: ((comment.channel as Record<string, unknown>)?.name as string) || "Anonymous",
    text: (comment.content as string) || "",
    time: (comment.published_date as string) || "",
    likes: (comment.extracted_vote_count as number) || 0,
    replies: (comment.replies_count as number) || 0,
    repliesToken: (comment.replies_next_page_token as string) || null,
  }))

  return {
    videoId: (data.video_id as string) || extractedVideoId,
    videoTitle: data.title as string | undefined,
    comments,
    commentCount: comments.length,
    nextPageToken: data.comments_next_page_token as string | undefined,
  }
}

export async function getReplies(pageToken: string): Promise<RepliesResponse> {
  if (!config.serpApiKey) {
    throw new Error("SERPAPI_KEY is not set in environment variables")
  }

  const data = await fetchFromSerpApi({
    engine: "youtube_video",
    next_page_token: pageToken,
  })

  const rawReplies = data.replies as Array<Record<string, unknown>> | undefined

  if (!rawReplies || !Array.isArray(rawReplies)) {
    return {
      parentCommentId: (data.comment_parent_id as string) || "",
      replies: [],
      replyCount: 0,
      nextPageToken: data.replies_next_page_token as string | undefined,
    }
  }

  const replies: Reply[] = rawReplies.map((reply) => ({
    commentId: (reply.comment_id as string) || "",
    author: ((reply.channel as Record<string, unknown>)?.name as string) || "Anonymous",
    text: (reply.content as string) || "",
    time: (reply.published_date as string) || "",
    likes: (reply.extracted_vote_count as number) || 0,
  }))

  return {
    parentCommentId: (data.comment_parent_id as string) || "",
    replies,
    replyCount: replies.length,
    nextPageToken: data.replies_next_page_token as string | undefined,
  }
}

export async function searchYouTube(
  query: string,
  limit: number,
  gl?: string,
  hl?: string,
  sp?: string,
  pageToken?: string
): Promise<SearchResponse> {
  if (!config.serpApiKey) {
    throw new Error("SERPAPI_KEY is not set in environment variables")
  }

  const params: Record<string, string> = {
    engine: "youtube",
    search_query: query,
  }

  if (gl) params.gl = gl
  if (hl) params.hl = hl
  if (sp) params.sp = sp
  if (pageToken) params.sp = pageToken

  const data = await fetchFromSerpApi(params)

  const videoResults = data.video_results as Array<Record<string, unknown>> | undefined
  const pagination = data.pagination as Record<string, unknown> | undefined

  return {
    searchMetadata: data.search_metadata as Record<string, unknown> | undefined,
    searchParameters: data.search_parameters as Record<string, unknown> | undefined,
    videoResults: videoResults?.slice(0, limit) || [],
    channelResults: data.channel_results as Array<Record<string, unknown>> | undefined,
    playlistResults: data.playlist_results as Array<Record<string, unknown>> | undefined,
    pagination: pagination ? {
      current: pagination.current as number | undefined,
      next: pagination.next as string | undefined,
      nextPageToken: pagination.next_page_token as string | undefined,
    } : undefined,
  }
}
