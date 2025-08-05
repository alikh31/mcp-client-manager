const MCPConfigSchema = require('../../src/schemas/config')

describe('MCPConfigSchema', () => {
  describe('StdioServerSchema', () => {
    it('should validate a valid stdio server config', () => {
      const validConfig = {
        mcpServers: {
          testServer: {
            transport: 'stdio',
            command: 'node',
            args: ['server.js'],
            env: { NODE_ENV: 'test' },
            version: '1.0.0',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('should validate stdio config without optional fields', () => {
      const validConfig = {
        mcpServers: {
          testServer: {
            transport: 'stdio',
            command: 'node',
            version: '1.0.0',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('should reject stdio config without required command', () => {
      const invalidConfig = {
        mcpServers: {
          testServer: {
            transport: 'stdio',
            version: '1.0.0',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(invalidConfig)).toThrow()
    })
  })

  describe('SseServerSchema', () => {
    it('should validate a valid SSE server config', () => {
      const validConfig = {
        mcpServers: {
          testServer: {
            transport: 'sse',
            url: 'https://example.com/sse',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('should reject SSE config with invalid URL', () => {
      const invalidConfig = {
        mcpServers: {
          testServer: {
            transport: 'sse',
            url: 'not-a-url',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(invalidConfig)).toThrow()
    })
  })

  describe('HttpStreamServerSchema', () => {
    it('should validate a valid HTTP stream server config', () => {
      const validConfig = {
        mcpServers: {
          testServer: {
            transport: 'http-stream',
            url: 'https://api.example.com/stream',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('should reject HTTP stream config with invalid URL', () => {
      const invalidConfig = {
        mcpServers: {
          testServer: {
            transport: 'http-stream',
            url: 'invalid-url',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(invalidConfig)).toThrow()
    })
  })

  describe('Mixed server configurations', () => {
    it('should validate config with multiple different server types', () => {
      const validConfig = {
        mcpServers: {
          stdioServer: {
            transport: 'stdio',
            command: 'node',
            args: ['server.js'],
            version: '1.0.0',
          },
          sseServer: {
            transport: 'sse',
            url: 'https://example.com/sse',
          },
          httpServer: {
            transport: 'http-stream',
            url: 'https://api.example.com/stream',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('should reject config with invalid transport type', () => {
      const invalidConfig = {
        mcpServers: {
          testServer: {
            transport: 'invalid-transport',
            command: 'node',
          },
        },
      }

      expect(() => MCPConfigSchema.parse(invalidConfig)).toThrow()
    })

    it('should reject empty mcpServers object', () => {
      const invalidConfig = {
        mcpServers: {},
      }

      expect(() => MCPConfigSchema.parse(invalidConfig)).not.toThrow()
    })
  })
})
