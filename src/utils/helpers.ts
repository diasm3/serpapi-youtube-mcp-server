/**
 * 다양한 형식의 YouTube URL에서 video ID를 추출
 */
export function getVideoId(urlOrId: string): string | null {
  // 이미 video ID인 경우
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) {
    return urlOrId;
  }
  
  // YouTube URL에서 ID 추출
  const patterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  
  for (const pattern of patterns) {
    const match = urlOrId.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

/**
 * YouTube API 호출 없이 웹 페이지에서 기본 비디오 정보 추출
 */
export async function fetchBasicVideoInfo(videoId: string) {
  try {
    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const html = await response.text();
    
    // 제목 추출 (메타 태그에서)
    const titleMatch = html.match(/<meta\s+name="title"\s+content="([^"]+)"/i);
    const title = titleMatch ? titleMatch[1] : undefined;
    
    // 채널명 추출 (메타 태그에서)
    const channelMatch = html.match(/<meta\s+name="author"\s+content="([^"]+)"/i);
    const channelName = channelMatch ? channelMatch[1] : undefined;
    
    // 업로드 날짜 추출 (스크립트 데이터에서 찾기)
    const publishedAtMatch = html.match(/"publishDate":"([^"]+)"/);
    const publishedAt = publishedAtMatch ? publishedAtMatch[1] : undefined;
    
    // 조회수 추출 (스크립트 데이터에서 찾기)
    const viewCountMatch = html.match(/"viewCount":"([^"]+)"/);
    const viewCount = viewCountMatch ? viewCountMatch[1] : undefined;
    
    return {
      title,
      channelName,
      publishedAt,
      viewCount
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return {
      title: undefined,
      channelName: undefined,
      publishedAt: undefined,
      viewCount: undefined
    };
  }
}