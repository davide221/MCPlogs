# MCP Log Reader

<div align="center">
  <img src="assets/mcp_logs.png" alt="MCP Log Reader" width="500"
  
  # MCP Log Reader
  
**MCP Server: Analyze & Debug Model Context Protocol Logs**
  <br>
  <br>
  🔍 **Read logs from standard locations across all platforms**
  <br>
  <br>
  🔎 **Filter, paginate, and analyze large log collections**
  <br>
  <br>
</div>

## 🎯 Overview

MCP Log Reader is a specialized MCP server that helps you analyze and debug Model Context Protocol logs. It provides Claude with direct access to log files, making it easy to troubleshoot MCP integrations and understand how Claude interacts with your tools.

- **Multi-platform Support**: Works on macOS, Windows, and Linux with platform-specific log paths
- **Smart Filtering**: Find specific log entries with case-insensitive text search
- **Paginated Browsing**: Navigate large log collections efficiently
- **Size Management**: Handles large log files with intelligent truncation
- **Seamless Claude Integration**: Works directly with Claude Desktop

## 🚀 Quick Start

Install directly from GitHub:
```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-log-reader.git
cd mcp-log-reader

# Install dependencies
npm i
```

Build and run:
```bash
# Compile TypeScript
npx tsc

# Run the server
node dist/server.js
```

## 🔌 Connecting to Claude

Add the server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "log-reader": {
      "command": "node",
      "args": [
        "/absolute/path/mcplogs/build"
      ]
    }
  }
}
```

Then restart Claude Desktop.

## 📋 Available Parameters

The log reader supports these parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `lines` | Number of lines to read from each log file | 100 |
| `filter` | Text to filter log entries by (case-insensitive) | "" |
| `customPath` | Custom path to log directory | OS-specific |
| `fileLimit` | Maximum number of files to read per page | 5 |
| `page` | Page number for pagination | 1 |

## 💡 Example Usage

Ask Claude to use the log reader tool:

```
Can you check my MCP logs for any connection errors in the last day?
```

Or with specific parameters:

```
Can you look through MCP logs with filter="error" and lines=50 to find initialization issues?
```

## ⚙️ How It Works

1. The server automatically detects your OS and finds the appropriate log directory
2. It locates all MCP log files and sorts them by modification time (newest first)
3. The requested page of log files is retrieved based on pagination settings
4. Files are processed with size limits to prevent overwhelming responses
5. Filtered content is returned in a structured format with pagination details

## 📄 License

MIT License