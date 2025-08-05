# MCP Client Manager

[![CI](https://github.com/alikh31/mcp-client-manager/workflows/CI/badge.svg)](https://github.com/alikh31/mcp-client-manager/actions)
[![npm version](https://badge.fury.io/js/mcp-client-manager.svg?icon=si%3Anpm)](https://badge.fury.io/js/mcp-client-manager)

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

// Or with options (disable logging)
const quietLoader = new MCPClientLoader({ enableLogging: false });
await quietLoader.loadClients('./config.json');

// Get all clients
const clients = loader.getClients();

// Get a specific client
const client = loader.getClient('myServer');

// Disconnect all clients
await loader.disconnect();
```

### Event Handling

Register custom handlers for MCP events:

```javascript
const { MCPClientLoader } = require('mcp-client-manager');

const loader = new MCPClientLoader();
await loader.loadClients('./config.json');

// Handle progress updates
loader.setNotificationHandler('progress', (clientName, notification) => {
  const { progress, total } = notification.params;
  console.log(`${clientName}: ${progress}/${total} completed`);
});

// Handle resource updates
loader.setNotificationHandler('resourceUpdated', (clientName, notification) => {
  console.log(`${clientName}: Resource ${notification.params.uri} was updated`);
});

// Handle tool list changes
loader.setNotificationHandler('toolListChanged', (clientName, notification) => {
  console.log(`${clientName}: Available tools have changed`);
});

// Handle errors
loader.setErrorHandler((clientName, error) => {
  console.error(`${clientName} error:`, error.message);
});

// Handle transport disconnections
loader.setTransportCloseHandler((clientName) => {
  console.log(`${clientName}: Connection closed`);
});
```

#### Available Event Types

**Notification Events:**
- `cancelled` - Request cancellation notifications
- `progress` - Progress updates for long-running operations
- `initialized` - Server initialization completion
- `rootsListChanged` - Root directory changes
- `resourceListChanged` - Resource list changes
- `resourceUpdated` - Specific resource updates
- `toolListChanged` - Tool list changes
- `loggingMessage` - Server logging messages
- `promptListChanged` - Prompt list changes

**Error Events:**
- `error` - Client and transport errors
- `transportClose` - Transport connection closed

### Direct ClientsManager Usage

```javascript
const { ClientsManager, MCPClientLoader } = require('mcp-client-manager');

// Load config from file and pass as object
const config = MCPClientLoader.readConfig('./config.json');
const manager = new ClientsManager(config);

await manager.connect();

// Or with options
const quietManager = new ClientsManager(config, { enableLogging: false });
await quietManager.connect();

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

#### Constructor

- `new MCPClientLoader(options)`: Create a new loader
  - `options.enableLogging`: Enable/disable console logging (default: true)

#### Methods

- `loadClients(configPath)`: Load and connect to MCP clients from config file
- `getClients()`: Get all loaded clients
- `getClient(name)`: Get a specific client by name
- `disconnect()`: Disconnect all clients
- `setNotificationHandler(eventType, handler)`: Register handler for notification events
- `setErrorHandler(handler)`: Register handler for error events
- `setTransportCloseHandler(handler)`: Register handler for transport close events

#### Handler Function Signatures

```javascript
// Notification handler: (clientName, notification) => void
loader.setNotificationHandler('progress', (clientName, notification) => {
  // Handle progress notification
});

// Error handler: (clientName, error) => void
loader.setErrorHandler((clientName, error) => {
  // Handle error
});

// Transport close handler: (clientName) => void
loader.setTransportCloseHandler((clientName) => {
  // Handle transport close
});
```

### ClientsManager

#### Constructor

- `new ClientsManager(config, options)`: Create a new clients manager
  - `config`: Configuration object with `mcpServers` property
  - `options.enableLogging`: Enable/disable console logging (default: true)

### MCPClientLoader

#### Static Methods

- `MCPClientLoader.readConfig(path)`: Read and parse configuration from file

#### Methods

- `connect()`: Connect to all configured servers
- `disconnect()`: Disconnect all clients and transports
- `getTransport(server)`: Get transport for server configuration
- `runMCPClient(server)`: Initialize a single MCP client
- `setNotificationHandler(eventType, handler)`: Register handler for notification events
- `setErrorHandler(handler)`: Register handler for error events
- `setTransportCloseHandler(handler)`: Register handler for transport close events

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