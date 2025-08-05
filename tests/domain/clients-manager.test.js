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
  const testConfig = {
    mcpServers: {
      testStdioServer: {
        transport: 'stdio',
        command: 'node',
        args: ['test-server.js'],
        version: '1.0.0',
      },
      testSseServer: {
        transport: 'sse',
        url: 'https://example.com/sse',
      },
      testHttpServer: {
        transport: 'http-stream',
        url: 'https://api.example.com/stream',
      },
    },
  }
  let mockClient
  let mockTransport

  beforeEach(() => {
    mockClient = {
      onerror: null,
      setLoggingLevel: jest.fn(),
      setNotificationHandler: jest.fn(),
      connect: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined),
    }

    mockTransport = {
      onerror: null,
      onclose: null,
      close: jest.fn().mockResolvedValue(undefined),
    }

    Client.mockImplementation(() => mockClient)
    StdioClientTransport.mockImplementation(() => mockTransport)
    SSEClientTransport.mockImplementation(() => mockTransport)
    StreamableHTTPClientTransport.mockImplementation(() => mockTransport)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with valid config object', () => {
      const manager = new ClientsManager(testConfig)

      expect(manager.config).toBeDefined()
      expect(manager.clients).toBeDefined()
      expect(manager.transports).toBeDefined()
      expect(Object.keys(manager.clients)).toHaveLength(3)
    })

    it('should throw error for invalid config object', () => {
      expect(() => {
        new ClientsManager({ invalid: 'config' })
      }).toThrow()
    })
  })


  describe('getTransport', () => {
    let manager

    beforeEach(() => {
      manager = new ClientsManager(testConfig)
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
      manager = new ClientsManager(testConfig)
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
      manager = new ClientsManager(testConfig)
    })

    it('should connect all clients successfully', async () => {
      await manager.connect()

      expect(mockClient.connect).toHaveBeenCalledTimes(3)
      expect(mockClient.setLoggingLevel).toHaveBeenCalledWith('critical')
      expect(mockClient.setNotificationHandler).toHaveBeenCalledTimes(27) // 9 handlers × 3 clients
    })

    it('should handle connection errors', async () => {
      const error = new Error('Connection failed')

      mockClient.connect.mockRejectedValueOnce(error)

      await expect(manager.connect()).rejects.toThrow('Connection failed')
    })
  })

  describe('notification handlers', () => {
    let manager
    let consoleErrorSpy
    let consoleLogSpy

    beforeEach(() => {
      manager = new ClientsManager(testConfig)
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
      consoleLogSpy.mockRestore()
    })

    it('should handle client errors', () => {
      const error = new Error('Test error')

      manager.handleClientError('testClient', error)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[testClient] Client error:', error)
    })

    it('should handle transport errors', () => {
      const error = new Error('Transport error')

      manager.handleTransportError('testClient', error)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[testClient] Transport error:', error)
    })

    it('should handle transport close', () => {
      const mockHandler = jest.fn()
      manager.setTransportCloseHandler(mockHandler)

      manager.handleTransportClose('testClient')

      expect(mockHandler).toHaveBeenCalledWith('testClient')
    })

    it('should handle all notification types', () => {
      const handlers = {
        cancelled: jest.fn(),
        progress: jest.fn(),
        initialized: jest.fn(),
        resourceListChanged: jest.fn(),
        toolListChanged: jest.fn(),
        loggingMessage: jest.fn(),
      }

      Object.keys(handlers).forEach(eventType => {
        manager.setNotificationHandler(eventType, handlers[eventType])
      })

      const testNotification = { params: { requestId: '123' } }

      manager.handleCancelled('testClient', testNotification)
      manager.handleProgress('testClient', { params: { progress: 50, total: 100 } })
      manager.handleInitialized('testClient', {})
      manager.handleResourceListChanged('testClient', {})
      manager.handleToolListChanged('testClient', {})
      manager.handleLoggingMessage('testClient', { params: { level: 'info', data: 'test message' } })

      expect(handlers.cancelled).toHaveBeenCalledWith('testClient', testNotification)
      expect(handlers.progress).toHaveBeenCalledWith('testClient', { params: { progress: 50, total: 100 } })
      expect(handlers.initialized).toHaveBeenCalledWith('testClient', {})
      expect(handlers.resourceListChanged).toHaveBeenCalledWith('testClient', {})
      expect(handlers.toolListChanged).toHaveBeenCalledWith('testClient', {})
      expect(handlers.loggingMessage).toHaveBeenCalledWith('testClient', { params: { level: 'info', data: 'test message' } })
    })
  })

  describe('user handler registration', () => {
    let manager
    let mockHandler

    beforeEach(() => {
      manager = new ClientsManager(testConfig)
      mockHandler = jest.fn()
    })

    it('should register and call notification handlers', () => {
      manager.setNotificationHandler('progress', mockHandler)

      const notification = { params: { progress: 50, total: 100 } }
      manager.handleProgress('testClient', notification)

      expect(mockHandler).toHaveBeenCalledWith('testClient', notification)
    })

    it('should register and call error handlers', () => {
      manager.setErrorHandler(mockHandler)

      const error = new Error('Test error')
      manager.handleClientError('testClient', error)

      expect(mockHandler).toHaveBeenCalledWith('testClient', error)
    })

    it('should register and call transport close handlers', () => {
      manager.setTransportCloseHandler(mockHandler)

      manager.handleTransportClose('testClient')

      expect(mockHandler).toHaveBeenCalledWith('testClient')
    })

    it('should handle multiple notification types', () => {
      const handlers = {
        cancelled: jest.fn(),
        initialized: jest.fn(),
        resourceListChanged: jest.fn(),
      }

      manager.setNotificationHandler('cancelled', handlers.cancelled)
      manager.setNotificationHandler('initialized', handlers.initialized)
      manager.setNotificationHandler('resourceListChanged', handlers.resourceListChanged)

      manager.handleCancelled('testClient', { params: { requestId: '123' } })
      manager.handleInitialized('testClient', {})
      manager.handleResourceListChanged('testClient', {})

      expect(handlers.cancelled).toHaveBeenCalledWith('testClient', { params: { requestId: '123' } })
      expect(handlers.initialized).toHaveBeenCalledWith('testClient', {})
      expect(handlers.resourceListChanged).toHaveBeenCalledWith('testClient', {})
    })

    it('should throw error for invalid handlers', () => {
      expect(() => manager.setNotificationHandler('progress', 'not-a-function')).toThrow('Handler must be a function')
      expect(() => manager.setErrorHandler(123)).toThrow('Handler must be a function')
      expect(() => manager.setTransportCloseHandler(null)).toThrow('Handler must be a function')
    })

    it('should handle errors in user handlers gracefully', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      const throwingHandler = jest.fn(() => { throw new Error('Handler error') })

      manager.setNotificationHandler('progress', throwingHandler)
      manager.handleProgress('testClient', { params: { progress: 50 } })

      expect(throwingHandler).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalledWith('[testClient] Error in user handler for progress:', expect.any(Error))

      consoleErrorSpy.mockRestore()
    })
  })

  describe('disconnect', () => {
    let manager

    beforeEach(() => {
      manager = new ClientsManager(testConfig)
    })

    it('should disconnect all clients and transports', async () => {
      await manager.disconnect()

      expect(mockClient.close).toHaveBeenCalledTimes(3)
      expect(mockTransport.close).toHaveBeenCalledTimes(3)
    })

    it('should handle disconnect errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
      mockClient.close.mockRejectedValueOnce(new Error('Close failed'))

      await expect(manager.disconnect()).resolves.not.toThrow()

      consoleErrorSpy.mockRestore()
    })
  })
})
