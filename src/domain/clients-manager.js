const { Client } = require('@modelcontextprotocol/sdk/client/index.js')
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js')
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js')
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js')
const {
  CancelledNotificationSchema,
  ProgressNotificationSchema,
  InitializedNotificationSchema,
  RootsListChangedNotificationSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  ToolListChangedNotificationSchema,
  LoggingMessageNotificationSchema,
  PromptListChangedNotificationSchema,
} = require('@modelcontextprotocol/sdk/types.js')
const MCPConfigInterface = require('../schemas/config')

module.exports = class ClientsManager {
  constructor(config, options = {}) {
    this.config = MCPConfigInterface.parse(config)
    this.options = {
      enableLogging: options.enableLogging !== false, // Default to true
      ...options,
    }

    this.clients = []
    this.transports = []
    this.userHandlers = new Map()
    this.setupNotificationHandlers()

    Object.keys(this.config.mcpServers)
      .forEach(name => this.runMCPClient({ ...this.config.mcpServers[name], name }))
  }

  setupNotificationHandlers() {
    this.notificationHandlers = new Map([
      [CancelledNotificationSchema, this.handleCancelled.bind(this)],
      [ProgressNotificationSchema, this.handleProgress.bind(this)],
      [InitializedNotificationSchema, this.handleInitialized.bind(this)],
      [RootsListChangedNotificationSchema, this.handleRootsListChanged.bind(this)],
      [ResourceListChangedNotificationSchema, this.handleResourceListChanged.bind(this)],
      [ResourceUpdatedNotificationSchema, this.handleResourceUpdated.bind(this)],
      [ToolListChangedNotificationSchema, this.handleToolListChanged.bind(this)],
      [LoggingMessageNotificationSchema, this.handleLoggingMessage.bind(this)],
      [PromptListChangedNotificationSchema, this.handlePromptListChanged.bind(this)],
    ])
  }

  setNotificationHandler(eventType, handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function')
    }
    this.userHandlers.set(eventType, handler)
  }

  setErrorHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function')
    }
    this.userHandlers.set('error', handler)
  }

  setTransportCloseHandler(handler) {
    if (typeof handler !== 'function') {
      throw new Error('Handler must be a function')
    }
    this.userHandlers.set('transportClose', handler)
  }

  log(level, message, ...args) {
    if (this.options.enableLogging) {
      console[level](message, ...args)
    }
  }

  callUserHandler(eventType, clientName, ...args) {
    const handler = this.userHandlers.get(eventType)
    if (handler) {
      try {
        handler(clientName, ...args)
      } catch (error) {
        this.log('error', `[${clientName}] Error in user handler for ${eventType}:`, error)
      }
    }
  }


  getTransport(server) {
    switch (server.transport) {
    case 'stdio': {
      return new StdioClientTransport({
        command: server.command,
        args: server.args,
        env: server.env,
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
      const client = new Client({
        name: server.name,
        version: server.version || '1.0.0',
      })

      const transport = this.getTransport(server)

      // Set up client error handler
      client.onerror = (error) => this.handleClientError(server.name, error)
      client.setLoggingLevel('critical')

      // Set up transport error handlers
      transport.onerror = (error) => this.handleTransportError(server.name, error)
      transport.onclose = () => this.handleTransportClose(server.name)

      // Set up all notification handlers
      this.notificationHandlers.forEach((handler, schema) => {
        client.setNotificationHandler(schema, (notification) =>
          handler(server.name, notification),
        )
      })

      this.clients[server.name] = client
      this.transports[server.name] = transport
    } catch (error) {
      throw new Error(`Failed to initialize client ${server.name}: ${error.message}`)
    }
  }

  handleClientError(name, error) {
    this.log('error', `[${name}] Client error:`, error)
    this.callUserHandler('error', name, error)
  }

  handleTransportError(name, error) {
    this.log('error', `[${name}] Transport error:`, error)
    this.callUserHandler('error', name, error)
  }

  handleTransportClose(name) {
    this.callUserHandler('transportClose', name)
  }

  handleCancelled(name, notification) {
    this.callUserHandler('cancelled', name, notification)
  }

  handleProgress(name, notification) {
    this.callUserHandler('progress', name, notification)
  }

  handleInitialized(name, notification) {
    this.callUserHandler('initialized', name, notification)
  }

  handleRootsListChanged(name, notification) {
    this.callUserHandler('rootsListChanged', name, notification)
  }

  handleResourceListChanged(name, notification) {
    this.callUserHandler('resourceListChanged', name, notification)
  }

  handleResourceUpdated(name, notification) {
    this.callUserHandler('resourceUpdated', name, notification)
  }

  handleToolListChanged(name, notification) {
    this.callUserHandler('toolListChanged', name, notification)
  }

  handleLoggingMessage(name, notification) {
    this.callUserHandler('loggingMessage', name, notification)
  }

  handlePromptListChanged(name, notification) {
    this.callUserHandler('promptListChanged', name, notification)
  }

  async connect() {
    return Promise.all(
      Object.keys(this.clients)
        .map(async name => {
          const client = this.clients[name]
          const transport = this.transports[name]

          try {
            await client.connect(transport)
          } catch (error) {
            this.log('error', `[${name}] Failed to connect:`, error)
            throw error
          }
        }),
    )
  }

  async disconnect() {
    const disconnectPromises = Object.keys(this.clients).map(async name => {
      const client = this.clients[name]
      const transport = this.transports[name]

      try {
        if (client && typeof client.close === 'function') {
          await client.close()
        }

        if (transport && typeof transport.close === 'function') {
          await transport.close()
        }
      } catch (error) {
        this.log('error', `[${name}] Error during disconnect:`, error)
      }
    })

    await Promise.all(disconnectPromises)
  }
}
