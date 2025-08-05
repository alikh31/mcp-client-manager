const path = require('path')
const fs = require('fs')

jest.mock('@modelcontextprotocol/sdk')
jest.mock('@modelcontextprotocol/sdk/client/index.js')
jest.mock('@modelcontextprotocol/sdk/client/stdio.js')
jest.mock('@modelcontextprotocol/sdk/client/sse.js')
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js')
jest.mock('@modelcontextprotocol/sdk/types.js')
jest.mock('../../src/domain/clients-manager')

const MCPClientLoader = require('../../src/lib/loader')
const ClientsManager = require('../../src/domain/clients-manager')

describe('MCPClientLoader', () => {
  const testConfigPath = path.join(__dirname, '../fixtures/test-config.json')
  let loader
  let mockClientManager

  beforeEach(() => {
    loader = new MCPClientLoader()
    mockClientManager = {
      clients: {
        testServer1: { name: 'testServer1' },
        testServer2: { name: 'testServer2' },
      },
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      setNotificationHandler: jest.fn((eventType, handler) => {
        mockClientManager.userHandlers.set(eventType, handler)
      }),
      setErrorHandler: jest.fn((handler) => {
        mockClientManager.userHandlers.set('error', handler)
      }),
      setTransportCloseHandler: jest.fn((handler) => {
        mockClientManager.userHandlers.set('transportClose', handler)
      }),
      userHandlers: new Map(),
    }
    ClientsManager.mockImplementation(() => mockClientManager)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('should initialize with null clientManager', () => {
      expect(loader.clientManager).toBeNull()
    })
  })

  describe('readConfig', () => {
    it('should read and parse valid config file', () => {
      const config = MCPClientLoader.readConfig(testConfigPath)

      expect(config).toBeDefined()
      expect(config.mcpServers).toBeDefined()
      expect(Object.keys(config.mcpServers)).toHaveLength(3)
    })

    it('should throw error for non-existent file', () => {
      expect(() => {
        MCPClientLoader.readConfig('/non/existent/path.json')
      }).toThrow('Config file not found')
    })

    it('should throw error for invalid JSON', () => {
      const invalidJsonPath = path.join(__dirname, '../fixtures/invalid.json')
      fs.writeFileSync(invalidJsonPath, '{ invalid json }')

      expect(() => {
        MCPClientLoader.readConfig(invalidJsonPath)
      }).toThrow('Invalid JSON in config file')

      fs.unlinkSync(invalidJsonPath)
    })
  })

  describe('loadClients', () => {
    it('should load clients successfully', async () => {
      const result = await loader.loadClients(testConfigPath)

      expect(ClientsManager).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers: expect.any(Object),
        }),
        expect.any(Object),
      )
      expect(mockClientManager.connect).toHaveBeenCalled()
      expect(result).toBe(mockClientManager)
      expect(loader.clientManager).toBe(mockClientManager)
    })

    it('should throw error when client loading fails', async () => {
      const error = new Error('Connection failed')
      mockClientManager.connect.mockRejectedValue(error)

      await expect(loader.loadClients(testConfigPath)).rejects.toThrow(
        'Failed to load MCP clients: Connection failed',
      )
    })

    it('should throw error when MCPClientManager construction fails', async () => {
      ClientsManager.mockImplementation(() => {
        throw new Error('Invalid config')
      })

      await expect(loader.loadClients(testConfigPath)).rejects.toThrow(
        'Failed to load MCP clients: Invalid config',
      )
    })
  })

  describe('getClients', () => {
    it('should return all clients when loaded', async () => {
      await loader.loadClients(testConfigPath)

      const clients = loader.getClients()

      expect(clients).toBe(mockClientManager.clients)
      expect(Object.keys(clients)).toHaveLength(2)
    })

    it('should throw error when clients not loaded', () => {
      expect(() => loader.getClients()).toThrow(
        'Clients not loaded. Call loadClients() first.',
      )
    })
  })

  describe('getClient', () => {
    it('should return specific client when loaded', async () => {
      await loader.loadClients(testConfigPath)

      const client = loader.getClient('testServer1')

      expect(client).toBe(mockClientManager.clients.testServer1)
      expect(client.name).toBe('testServer1')
    })

    it('should return undefined for non-existent client', async () => {
      await loader.loadClients(testConfigPath)

      const client = loader.getClient('nonExistentServer')

      expect(client).toBeUndefined()
    })

    it('should throw error when clients not loaded', () => {
      expect(() => loader.getClient('testServer1')).toThrow(
        'Clients not loaded. Call loadClients() first.',
      )
    })
  })

  describe('disconnect', () => {
    it('should call clientManager disconnect', async () => {
      await loader.loadClients(testConfigPath)
      await loader.disconnect()

      expect(mockClientManager.disconnect).toHaveBeenCalled()
    })

    it('should handle disconnect when no clients loaded', async () => {
      await expect(loader.disconnect()).resolves.not.toThrow()
    })

    it('should handle disconnect errors gracefully', async () => {
      mockClientManager.disconnect.mockRejectedValueOnce(new Error('Disconnect failed'))

      await loader.loadClients(testConfigPath)

      await expect(loader.disconnect()).rejects.toThrow('Disconnect failed')
    })
  })

  describe('handler registration', () => {
    let loader
    let mockHandler

    beforeEach(async () => {
      loader = new MCPClientLoader()
      mockHandler = jest.fn()
      await loader.loadClients(testConfigPath)
    })

    it('should register notification handlers through loader', () => {
      loader.setNotificationHandler('progress', mockHandler)

      expect(loader.clientManager.userHandlers.get('progress')).toBe(mockHandler)
    })

    it('should register error handlers through loader', () => {
      loader.setErrorHandler(mockHandler)

      expect(loader.clientManager.userHandlers.get('error')).toBe(mockHandler)
    })

    it('should register transport close handlers through loader', () => {
      loader.setTransportCloseHandler(mockHandler)

      expect(loader.clientManager.userHandlers.get('transportClose')).toBe(mockHandler)
    })

    it('should throw error when setting handlers before loading clients', () => {
      const newLoader = new MCPClientLoader()

      expect(() => newLoader.setNotificationHandler('progress', mockHandler)).toThrow('Clients not loaded. Call loadClients() first.')
      expect(() => newLoader.setErrorHandler(mockHandler)).toThrow('Clients not loaded. Call loadClients() first.')
      expect(() => newLoader.setTransportCloseHandler(mockHandler)).toThrow('Clients not loaded. Call loadClients() first.')
    })
  })
})
