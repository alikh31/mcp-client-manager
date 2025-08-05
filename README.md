# MCP Client Manager

[![CI](https://github.com/alikh31/mcp-client-manager/workflows/CI/badge.svg)](https://github.com/alikh31/mcp-client-manager/actions)
[![npm version](https://badge.fury.io/js/mcp-client-manager.png?icon=si%3Anpm)](https://badge.fury.io/js/mcp-client-manager)

> **⚠️ Development Status**: This package is currently under active development. APIs may change and features may be incomplete. Use in production environments at your own risk.

Node.js library for loading and managing Model Context Protocol (MCP) clients.

## Installation

```bash
npm install mcp-client-manager
```

## Usage

### Basic Usage

```javascript
const { MCPClientLoader, ClientsManager, MCPConfigSchema } = require('mcp-client-manager');

// Load and connect to MCP clients
const loader = new MCPClientLoader();
await loader.loadClients('./config.json');

// Get all clients
const clients = loader.getClients();

// Get a specific client
const client = loader.getClient('myServer');

// Disconnect all clients
await loader.disconnect();
```

### Direct ClientsManager Usage

```javascript
const { ClientsManager, MCPClientLoader } = require('mcp-client-manager');

// Load config from file and pass as object
const config = MCPClientLoader.readConfig('./config.json');
const manager = new ClientsManager(config);

await manager.connect();

// Or pass config object directly
const configObject = {
  mcpServers: {
    myServer: {
      transport: 'stdio',
      command: 'node',
      args: ['server.js']
    }
  }
};
const manager2 = new ClientsManager(configObject);
await manager2.connect();
```

## Configuration

Create a configuration file with your MCP servers:

```json
{
  "mcpServers": {
    "stdioServer": {
      "transport": "stdio",
      "command": "node",
      "args": ["server.js"],
      "env": { "NODE_ENV": "production" },
      "version": "1.0.0"
    },
    "sseServer": {
      "transport": "sse",
      "url": "https://example.com/sse"
    },
    "httpStreamServer": {
      "transport": "http-stream",
      "url": "https://api.example.com/stream"
    }
  }
}
```

### Transport Types

- **stdio**: Standard input/output transport
  - `command`: Command to execute
  - `args`: Command arguments (optional)
  - `env`: Environment variables (optional)
  - `version`: Server version (optional)

- **sse**: Server-Sent Events transport
  - `url`: SSE endpoint URL

- **http-stream**: HTTP streaming transport
  - `url`: HTTP streaming endpoint URL

## API Reference

### MCPClientLoader

#### Methods

- `loadClients(configPath)`: Load and connect to MCP clients from config file
- `getClients()`: Get all loaded clients
- `getClient(name)`: Get a specific client by name
- `disconnect()`: Disconnect all clients

### ClientsManager

#### Constructor

- `new ClientsManager(config)`: Create a new clients manager
  - `config`: Configuration object with `mcpServers` property

### MCPClientLoader

#### Static Methods

- `MCPClientLoader.readConfig(path)`: Read and parse configuration from file

#### Methods

- `connect()`: Connect to all configured servers
- `getTransport(server)`: Get transport for server configuration
- `runMCPClient(server)`: Initialize a single MCP client

### MCPConfigSchema

Zod schema for validating MCP server configurations.

## Development

### Scripts

- `npm test`: Run tests
- `npm run test:watch`: Run tests in watch mode
- `npm run test:coverage`: Run tests with coverage
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint issues

### Requirements

- Node.js >= 18.0.0

## License

MIT