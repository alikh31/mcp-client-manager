const ClientsManager = require('../domain/clients-manager')

class MCPClientLoader {
  constructor() {
    this.clientManager = null
  }

  async loadClients(configPath) {
    try {
      this.clientManager = new ClientsManager({
        MCP_SERVERS_CONFIG_FILE: configPath,
      })

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
      const disconnectPromises = Object.values(this.clientManager.clients).map(client => {
        if (client && typeof client.close === 'function') {
          return client.close()
        }
      })
      await Promise.all(disconnectPromises)
    }
  }
}

module.exports = MCPClientLoader
