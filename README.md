MCP Log Reader
<div align="center">
  <img src="assets/mcp-logs.png" alt="MCP Log Reader" width="600" style="border-radius: 10px; margin: 20px 0;"/>
MCP Server: Analyze & Debug Model Context Protocol Logs
<br>
<br>
🔍 Read logs from standard locations across all platforms
<br>
<br>
🔎 Filter, paginate, and analyze large log collections
<br>
<br>
</div>
🎯 Overview
MCP Log Reader is a specialized MCP server that helps you analyze and debug Model Context Protocol logs. It provides Claude with direct access to log files, making it easy to troubleshoot MCP integrations and understand how Claude interacts with your tools.

Multi-platform Support: Works on macOS, Windows, and Linux with platform-specific log paths
Smart Filtering: Find specific log entries with case-insensitive text search
Paginated Browsing: Navigate large log collections efficiently
Size Management: Handles large log files with intelligent truncation
Seamless Claude Integration: Works directly with Claude Desktop


🚀 Quick Start
Install directly from GitHub:
bashCopy# Clone the repository
git clone https://github.com/yourusername/mcp-log-reader.git
cd mcp-log-reader

# Install dependencies
npm i
Build and run:
bashCopy# Compile TypeScript
npx tsc

# Run the server
🔌 Connecting to Claude

Add the server to your Claude Desktop configuration:
jsonCopy{
  "mcpServers": {
    "log-reader": {
      "command": "node",
      "args": [
        "/absolute/path/mcplogs/build"
      ]
    }
  }
}
Then restart Claude Desktop.

📋 Available Parameters
The log reader supports these parameters:
ParameterDescriptionDefaultlinesNumber of lines to read from each log file100filterText to filter log entries by (case-insensitive)""customPathCustom path to log directoryOS-specificfileLimitMaximum number of files to read per page5pagePage number for pagination1

💡 Example Usage
Ask Claude to use the log reader tool:
CopyCan you check my MCP logs for any connection errors in the last day?
Or with specific parameters:
CopyCan you look through MCP logs with filter="error" and lines=50 to find initialization issues?
⚙️ How It Works

The server automatically detects your OS and finds the appropriate log directory
It locates all MCP log files and sorts them by modification time (newest first)
The requested page of log files is retrieved based on pagination settings
Files are processed with size limits to prevent overwhelming responses
Filtered content is returned in a structured format with pagination details

📄 License
MIT License