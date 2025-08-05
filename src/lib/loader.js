const ClientsManager = require('../domain/clients-manager')
const MCPConfigInterface = require('../schemas/config')
const fs = require('fs')

class MCPClientLoader {
  constructor(options = {}) {
    this.clientManager = null
    this.options = options
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

  async loadClients(configPath) {
    try {
      const config = MCPClientLoader.readConfig(configPath)
      this.clientManager = new ClientsManager(config, this.options)

      await this.clientManager.connect()
      return this.clientManager
    } catch (error) {
      throw new Error(`Failed to load MCP clients: ${error.message}`)
    }
  }

  getClients() {
    if (!this.clientManager) {
      throw new Error('Clients not loaded. Call loadClients() first.')
    }
    return this.clientManager.clients
  }

  getClient(name) {
    if (!this.clientManager) {
      throw new Error('Clients not loaded. Call loadClients() first.')
    }
    return this.clientManager.clients[name]
  }

  async disconnect() {
    if (this.clientManager) {
      await this.clientManager.disconnect()
    }
  }

  setNotificationHandler(eventType, handler) {
    if (!this.clientManager) {
      throw new Error('Clients not loaded. Call loadClients() first.')
    }
    this.clientManager.setNotificationHandler(eventType, handler)
  }

  setErrorHandler(handler) {
    if (!this.clientManager) {
      throw new Error('Clients not loaded. Call loadClients() first.')
    }
    this.clientManager.setErrorHandler(handler)
  }

  setTransportCloseHandler(handler) {
    if (!this.clientManager) {
      throw new Error('Clients not loaded. Call loadClients() first.')
    }
    this.clientManager.setTransportCloseHandler(handler)
  }
}

module.exports = MCPClientLoader
