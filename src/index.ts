#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import express, { Request, Response } from "express"
import { config, validateConfig } from "./config/index.js"
import { registerTools } from "./tools/index.js"

function createServer(): McpServer {
  const server = new McpServer({
    name: config.server.name,
    version: config.server.version,
  })

  registerTools(server)

  return server
}

async function startHttpServer(): Promise<void> {
  const app = express()
  app.use(express.json())

  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", server: config.server.name, version: config.server.version })
  })

  app.post("/mcp", async (req: Request, res: Response) => {
    const server = createServer()
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    })

    res.on("close", () => {
      transport.close()
    })

    await server.connect(transport)
    await transport.handleRequest(req, res, req.body)
  })

  app.listen(config.server.port, () => {
    console.log(`YouTube Data MCP Server running on http://localhost:${config.server.port}`)
    console.log(`  - Health check: GET /health`)
    console.log(`  - MCP endpoint: POST /mcp`)
  })
}

async function startStdioServer(): Promise<void> {
  const server = createServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error("YouTube Data MCP Server running on stdio")
}

async function main(): Promise<void> {
  validateConfig()

  const useHttp = process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http"

  if (useHttp) {
    await startHttpServer()
  } else {
    await startStdioServer()
  }
}

main().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})
