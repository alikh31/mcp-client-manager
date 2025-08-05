const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js')
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js')
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js')
const {
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
} = require('@modelcontextprotocol/sdk/types.js')
const fs = require('fs')
const MCPConfigInterface = require('../schemas/config')

module.exports = class ClientsManager {
  constructor(config) {
    this.config = ClientsManager
      .readConfig(config.MCP_SERVERS_CONFIG_FILE)

    this.clients = []
    this.transports = []

    Object.keys(this.config.mcpServers)
      .forEach(name => this.runMCPClient({ ...this.config.mcpServers[name], name }))
  }

  static readConfig(path) {
    try {
      if (!fs.existsSync(path)) {
        throw new Error(`Config file not found: ${path}`)
      }
      const content = fs.readFileSync(path, 'utf8')
      const parsedContent = JSON.parse(content)
      return MCPConfigInterface.parse(parsedContent)
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in config file: ${error.message}`)
      }
      throw error
    }
  }

  getTransport(server) {
    switch (server.transport) {
    case 'stdio': {
      return new StdioClientTransport({
        command: server.command,
        args: server.args,
      })
    }
    case 'sse': {
      return new SSEClientTransport(server.url)
    }
    case 'http-stream': {
      return new StreamableHTTPClientTransport(server.url)
    }
    default:
      throw new Error(`Unsupported transport: ${server.transport}`)
    }
  }

  runMCPClient(server = {}) {
    if (!server.name) {
      throw new Error('Server name is required')
    }
    try {
      this.clients[server.name] = new Client({
        name: server.name,
        version: server.version || '1.0.0',
      })
      this.transports[server.name] = this.getTransport(server)
    } catch (error) {
      throw new Error(`Failed to initialize client ${server.name}: ${error.message}`)
    }
  }

  onError(name, error) {
    console.log('----')
    console.log(name, error)
  }

  async connect() {
    return Promise.all(
      Object.keys(this.clients)
        .map(async name => {
          const client = this.clients[name]
          client.onerror = error => this.onError(name, error)
          client.setLoggingLevel('critical')
          client.setNotificationHandler(CancelledNotificationSchema, notification => console.log('----', notification))
          client.setNotificationHandler(ProgressNotificationSchema, notification => console.log('----', notification))
          client.setNotificationHandler(InitializedNotificationSchema, notification => console.log('----', notification))
          client.setNotificationHandler(RootsListChangedNotificationSchema, notification => console.log('----', notification))

          await client.connect(this.transports[name])
        }),
    )
  }
}
