import { getSubtitles, getVideoDetails, type Subtitle } from "youtube-caption-extractor"
import type { TranscriptResponse, VideoBasicInfo } from "../types/index.js"

export async function fetchBasicVideoInfo(videoId: string): Promise<VideoBasicInfo> {
  try {
    const details = await getVideoDetails({ videoID: videoId, lang: "en" })
    return {
      title: details.title,
      channelName: undefined,
      publishedAt: undefined,
      viewCount: undefined,
    }
  } catch {
    return fetchVideoInfoFromPage(videoId)
  }
}

async function fetchVideoInfoFromPage(videoId: string): Promise<VideoBasicInfo> {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    })

    if (!response.ok) {
      return {}
    }

    const html = await response.text()

    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i)
    const channelMatch = html.match(/<meta\s+name="author"\s+content="([^"]+)"/i)
    const publishedAtMatch = html.match(/"publishDate":"([^"]+)"/)
    const viewCountMatch = html.match(/"viewCount":"([^"]+)"/)

    return {
      title: titleMatch?.[1],
      channelName: channelMatch?.[1],
      publishedAt: publishedAtMatch?.[1],
      viewCount: viewCountMatch?.[1],
    }
  } catch {
    return {}
  }
}

function formatSubtitles(subtitles: Subtitle[]): string {
  return subtitles.map((s) => s.text).join(" ")
}

export async function getTranscript(
  videoId: string,
  lang: string = "en"
): Promise<TranscriptResponse> {
  let subtitles: Subtitle[] = []
  let videoTitle: string | undefined
  let videoDescription: string | undefined

  try {
    const details = await getVideoDetails({ videoID: videoId, lang })
    subtitles = details.subtitles || []
    videoTitle = details.title
    videoDescription = details.description
  } catch (primaryError) {
    try {
      subtitles = await getSubtitles({ videoID: videoId, lang })
    } catch (fallbackError) {
      const errorMessage = primaryError instanceof Error ? primaryError.message : "Unknown error"
      throw new Error(`Failed to fetch transcript: ${errorMessage}. Video may not have captions available in '${lang}' language.`)
    }
  }

  if (subtitles.length === 0) {
    throw new Error(`No transcript available for this video in '${lang}' language. Try a different language code.`)
  }

  const videoInfo = await fetchBasicVideoInfo(videoId)

  return {
    videoInfo: {
      id: videoId,
      title: videoTitle || videoInfo.title,
      channelName: videoInfo.channelName,
      publishedAt: videoInfo.publishedAt,
      viewCount: videoInfo.viewCount,
    },
    fullText: formatSubtitles(subtitles),
    language: lang,
  }
}

export async function getTranscriptWithTimestamps(
  videoId: string,
  lang: string = "en"
): Promise<TranscriptResponse & { segments: Array<{ start: string; duration: string; text: string }> }> {
  let subtitles: Subtitle[] = []
  let videoTitle: string | undefined

  try {
    const details = await getVideoDetails({ videoID: videoId, lang })
    subtitles = details.subtitles || []
    videoTitle = details.title
  } catch {
    subtitles = await getSubtitles({ videoID: videoId, lang })
  }

  if (subtitles.length === 0) {
    throw new Error(`No transcript available for this video in '${lang}' language.`)
  }

  const videoInfo = await fetchBasicVideoInfo(videoId)

  return {
    videoInfo: {
      id: videoId,
      title: videoTitle || videoInfo.title,
      channelName: videoInfo.channelName,
      publishedAt: videoInfo.publishedAt,
      viewCount: videoInfo.viewCount,
    },
    fullText: formatSubtitles(subtitles),
    language: lang,
    segments: subtitles.map((s) => ({
      start: s.start,
      duration: s.dur,
      text: s.text,
    })),
  }
}
