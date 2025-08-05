const z = require('zod')

const StdioServerSchema = z.object({
  transport: z.literal('stdio'),
  command: z.string(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  version: z.string(),
})

const SseServerSchema = z.object({
  transport: z.literal('sse'),
  url: z.string().url(),
})

const HttpStreamServerSchema = z.object({
  transport: z.literal('http-stream'),
  url: z.string().url(),
})

const ServerConfigSchema = z.discriminatedUnion('transport', [
  StdioServerSchema,
  SseServerSchema,
  HttpStreamServerSchema,
])

const McpConfigSchema = z.object({
  mcpServers: z.record(ServerConfigSchema),
})

module.exports = McpConfigSchema
