const VIDEO_ID_PATTERNS = [
  /^[a-zA-Z0-9_-]{11}$/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
]

export function getVideoId(urlOrId: string): string | null {
  if (VIDEO_ID_PATTERNS[0].test(urlOrId)) {
    return urlOrId
  }

  for (let i = 1; i < VIDEO_ID_PATTERNS.length; i++) {
    const match = urlOrId.match(VIDEO_ID_PATTERNS[i])
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

export function createToolResponse<T>(output: T): {
  content: Array<{ type: "text"; text: string }>
  structuredContent: T
} {
  return {
    content: [{ type: "text", text: JSON.stringify(output, null, 2) }],
    structuredContent: output,
  }
}

export function createErrorResponse(error: unknown): {
  content: Array<{ type: "text"; text: string }>
} {
  const message = error instanceof Error ? error.message : "Unknown error"
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
  }
}
