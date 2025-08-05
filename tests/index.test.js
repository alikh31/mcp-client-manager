jest.mock('@modelcontextprotocol/sdk')
jest.mock('@modelcontextprotocol/sdk/client/index.js')
jest.mock('@modelcontextprotocol/sdk/client/stdio.js')
jest.mock('@modelcontextprotocol/sdk/client/sse.js')
jest.mock('@modelcontextprotocol/sdk/client/streamableHttp.js')
jest.mock('@modelcontextprotocol/sdk/types.js')

const mcpClientManager = require('../index')

describe('index.js exports', () => {
  it('should export MCPClientLoader', () => {
    expect(mcpClientManager.MCPClientLoader).toBeDefined()
    expect(typeof mcpClientManager.MCPClientLoader).toBe('function')
  })

  it('should export ClientsManager', () => {
    expect(mcpClientManager.ClientsManager).toBeDefined()
    expect(typeof mcpClientManager.ClientsManager).toBe('function')
  })

  it('should export MCPConfigSchema', () => {
    expect(mcpClientManager.MCPConfigSchema).toBeDefined()
    expect(typeof mcpClientManager.MCPConfigSchema).toBe('object')
  })

  it('should export all expected properties', () => {
    const expectedExports = ['MCPClientLoader', 'ClientsManager', 'MCPConfigSchema']
    const actualExports = Object.keys(mcpClientManager)

    expect(actualExports).toEqual(expect.arrayContaining(expectedExports))
    expect(actualExports).toHaveLength(expectedExports.length)
  })
})
