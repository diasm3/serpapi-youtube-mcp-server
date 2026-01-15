import * as dotenv from "dotenv"

dotenv.config()

export const config = {
  serpApiKey: process.env.SERPAPI_KEY || "",
  serpApiBaseUrl: "https://serpapi.com/search.json",
  server: {
    name: "youtube-data-mcp",
    version: "2.0.0",
    port: parseInt(process.env.PORT || "3000", 10),
  },
} as const

export function validateConfig(): void {
  if (!config.serpApiKey) {
    console.warn("Warning: SERPAPI_KEY is not set. Some features will not work.")
  }
}
