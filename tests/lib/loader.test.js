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

      expect(ClientsManager).toHaveBeenCalledWith(expect.objectContaining({
        mcpServers: expect.any(Object)
      }))
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
    it('should disconnect all clients with close method', async () => {
      const mockClient1 = { close: jest.fn().mockResolvedValue(undefined) }
      const mockClient2 = { close: jest.fn().mockResolvedValue(undefined) }

      mockClientManager.clients = {
        testServer1: mockClient1,
        testServer2: mockClient2,
      }

      await loader.loadClients(testConfigPath)
      await loader.disconnect()

      expect(mockClient1.close).toHaveBeenCalled()
      expect(mockClient2.close).toHaveBeenCalled()
    })

    it('should handle clients without close method', async () => {
      const mockClient1 = { name: 'testServer1' }
      const mockClient2 = { close: jest.fn().mockResolvedValue(undefined) }

      mockClientManager.clients = {
        testServer1: mockClient1,
        testServer2: mockClient2,
      }

      await loader.loadClients(testConfigPath)
      await loader.disconnect()

      expect(mockClient2.close).toHaveBeenCalled()
    })

    it('should handle disconnect when no clients loaded', async () => {
      await expect(loader.disconnect()).resolves.not.toThrow()
    })

    it('should handle disconnect errors gracefully', async () => {
      const mockClient = {
        close: jest.fn().mockRejectedValue(new Error('Disconnect failed')),
      }

      mockClientManager.clients = { testServer: mockClient }

      await loader.loadClients(testConfigPath)

      await expect(loader.disconnect()).rejects.toThrow('Disconnect failed')
    })
  })
})
