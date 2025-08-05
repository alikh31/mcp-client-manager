const fs = require('fs')
const path = require('path')

jest.mock('@modelcontextprotocol/sdk')
jest.mock('@modelcontextprotocol/sdk/client/index.js')
jest.mock('@modelcontextprotocol/sdk/client/stdio.js')
jest.mock('@modelcontextprotocol/sdk/client/sse.js')
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js')
jest.mock('@modelcontextprotocol/sdk/types.js')

const ClientsManager = require('../../src/domain/clients-manager')
const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js')
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js')
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js')

describe('ClientsManager', () => {
  const testConfigPath = path.join(__dirname, '../fixtures/test-config.json')
  let mockClient

  beforeEach(() => {
    mockClient = {
      onerror: null,
      setLoggingLevel: jest.fn(),
      setNotificationHandler: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
    }
    Client.mockImplementation(() => mockClient)
    StdioClientTransport.mockImplementation(() => ({}))
    SSEClientTransport.mockImplementation(() => ({}))
    StreamableHTTPClientTransport.mockImplementation(() => ({}))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with valid config file', () => {
      const manager = new ClientsManager({
        MCP_SERVERS_CONFIG_FILE: testConfigPath,
      })

      expect(manager.config).toBeDefined()
      expect(manager.clients).toBeDefined()
      expect(manager.transports).toBeDefined()
      expect(Object.keys(manager.clients)).toHaveLength(3)
    })

    it('should throw error for non-existent config file', () => {
      expect(() => {
        new ClientsManager({
          MCP_SERVERS_CONFIG_FILE: '/non/existent/path.json',
        })
      }).toThrow('Config file not found')
    })
  })

  describe('readConfig', () => {
    it('should read and parse valid config file', () => {
      const config = ClientsManager.readConfig(testConfigPath)

      expect(config).toBeDefined()
      expect(config.mcpServers).toBeDefined()
      expect(Object.keys(config.mcpServers)).toHaveLength(3)
    })

    it('should throw error for non-existent file', () => {
      expect(() => {
        ClientsManager.readConfig('/non/existent/path.json')
      }).toThrow('Config file not found')
    })

    it('should throw error for invalid JSON', () => {
      const invalidJsonPath = path.join(__dirname, '../fixtures/invalid.json')
      fs.writeFileSync(invalidJsonPath, '{ invalid json }')

      expect(() => {
        ClientsManager.readConfig(invalidJsonPath)
      }).toThrow('Invalid JSON in config file')

      fs.unlinkSync(invalidJsonPath)
    })
  })

  describe('getTransport', () => {
    let manager

    beforeEach(() => {
      manager = new ClientsManager({
        MCP_SERVERS_CONFIG_FILE: testConfigPath,
      })
    })

    it('should create StdioClientTransport for stdio transport', () => {
      const server = {
        transport: 'stdio',
        command: 'node',
        args: ['server.js'],
      }

      manager.getTransport(server)

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: 'node',
        args: ['server.js'],
      })
    })

    it('should create SSEClientTransport for sse transport', () => {
      const server = {
        transport: 'sse',
        url: 'https://example.com/sse',
      }

      manager.getTransport(server)

      expect(SSEClientTransport).toHaveBeenCalledWith('https://example.com/sse')
    })

    it('should create StreamableHTTPClientTransport for http-stream transport', () => {
      const server = {
        transport: 'http-stream',
        url: 'https://api.example.com/stream',
      }

      manager.getTransport(server)

      expect(StreamableHTTPClientTransport).toHaveBeenCalledWith('https://api.example.com/stream')
    })

    it('should throw error for unsupported transport', () => {
      const server = {
        transport: 'unsupported',
        url: 'https://example.com',
      }

      expect(() => {
        manager.getTransport(server)
      }).toThrow('Unsupported transport: unsupported')
    })
  })

  describe('runMCPClient', () => {
    let manager

    beforeEach(() => {
      manager = new ClientsManager({
        MCP_SERVERS_CONFIG_FILE: testConfigPath,
      })
    })

    it('should throw error for server without name', () => {
      expect(() => {
        manager.runMCPClient({})
      }).toThrow('Server name is required')
    })

    it('should create client with default version if not provided', () => {
      const server = {
        name: 'testServer',
        transport: 'stdio',
        command: 'node',
      }

      manager.runMCPClient(server)

      expect(Client).toHaveBeenCalledWith({
        name: 'testServer',
        version: '1.0.0',
      })
    })

    it('should create client with provided version', () => {
      const server = {
        name: 'testServer',
        transport: 'stdio',
        command: 'node',
        version: '2.0.0',
      }

      manager.runMCPClient(server)

      expect(Client).toHaveBeenCalledWith({
        name: 'testServer',
        version: '2.0.0',
      })
    })
  })

  describe('connect', () => {
    let manager

    beforeEach(() => {
      manager = new ClientsManager({
        MCP_SERVERS_CONFIG_FILE: testConfigPath,
      })
    })

    it('should connect all clients successfully', async () => {
      await manager.connect()

      expect(mockClient.connect).toHaveBeenCalledTimes(3)
      expect(mockClient.setLoggingLevel).toHaveBeenCalledWith('critical')
      expect(mockClient.setNotificationHandler).toHaveBeenCalledTimes(12) // 4 handlers × 3 clients
    })

    it('should handle connection errors', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      const error = new Error('Connection failed')

      mockClient.connect.mockRejectedValueOnce(error)

      await expect(manager.connect()).rejects.toThrow('Connection failed')

      consoleLogSpy.mockRestore()
    })
  })

  describe('onError', () => {
    let manager
    let consoleLogSpy

    beforeEach(() => {
      manager = new ClientsManager({
        MCP_SERVERS_CONFIG_FILE: testConfigPath,
      })
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      consoleLogSpy.mockRestore()
    })

    it('should log error messages', () => {
      const error = new Error('Test error')

      manager.onError('testClient', error)

      expect(consoleLogSpy).toHaveBeenCalledWith('----')
      expect(consoleLogSpy).toHaveBeenCalledWith('testClient', error)
    })
  })
})
