import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ErrorCode, 
  ListToolsRequestSchema, 
  McpError 
} from "@modelcontextprotocol/sdk/types.js";
import { readFile, readdir } from "node:fs/promises";
import path from "path";
import fs from "fs";
import os from "os";
import { glob } from "glob";

// Function to save logs safely without interfering with JSON-RPC
async function saveLog(message: string) {
  try {
    const logPath = path.join(process.cwd(), "mcp_debug.log");
    await fs.promises.appendFile(logPath, `${new Date().toISOString()}: ${message}\n`);
  } catch (error) {
    // Ignore errors in logging
  }
}

const server = new Server({
    name: "mcp-server",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {}
    }
});

const transport = new StdioServerTransport();
await server.connect(transport);

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "read_mcp_logs",
                description: "Read MCP logs from the standard location",
                inputSchema: {
                    type: "object",
                    properties: {
                        lines: {
                            type: "number",
                            description: "Number of lines to read from the end of each log file (default: 100)"
                        },
                        filter: {
                            type: "string",
                            description: "Optional text to filter log entries by (case-insensitive)"
                        },
                        customPath: {
                            type: "string", 
                            description: "Optional custom path to log directory (default is system-specific)"
                        },
                        fileLimit: {
                            type: "number",
                            description: "Maximum number of files to read per page (default: 5)"
                        },
                        page: {
                            type: "number",
                            description: "Page number for pagination (default: 1)"
                        }
                    }
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === "read_mcp_logs") {
        const args = request.params.arguments || {};
        const { 
            lines = 100, 
            filter = "", 
            customPath,
            fileLimit = 5, // Limit number of files to process
            page = 1       // For pagination
        } = args as { 
            lines?: number, 
            filter?: string,
            customPath?: string,
            fileLimit?: number,
            page?: number
        };

        try {
            // Get default log directory based on operating system
            let logDir: string;
            
            if (customPath) {
                logDir = customPath;
            } else {
                const homedir = os.homedir();
                
                if (process.platform === 'darwin') {
                    // macOS log path
                    logDir = path.join(homedir, 'Library/Logs/Claude');
                } else if (process.platform === 'win32') {
                    // Windows log path
                    logDir = path.join(homedir, 'AppData/Roaming/Claude/logs');
                } else {
                    // Linux/other OS log path (might need adjustment)
                    logDir = path.join(homedir, '.config/Claude/logs');
                }
            }
            
            await saveLog(`Looking for MCP logs in: ${logDir}`);
            
            let allLogFiles: string[] = [];
            try {
                // Use glob to find all mcp log files
                allLogFiles = await glob(`${logDir}/mcp*.log`);
                
                // If no files found, try a more general pattern as fallback
                if (allLogFiles.length === 0) {
                    allLogFiles = await glob(`${logDir}/*.log`);
                }
            } catch (globError) {
                // If glob fails, try using readdir as a fallback
                const dirFiles = await readdir(logDir);
                allLogFiles = dirFiles
                    .filter(file => file.startsWith('mcp') && file.endsWith('.log'))
                    .map(file => path.join(logDir, file));
                
                // If still no files, try any log file
                if (allLogFiles.length === 0) {
                    allLogFiles = dirFiles
                        .filter(file => file.endsWith('.log'))
                        .map(file => path.join(logDir, file));
                }
            }
            
            // Sort files by modification time (newest first)
            const filesWithStats = await Promise.all(
                allLogFiles.map(async (file) => {
                    const stats = await fs.promises.stat(file);
                    return { 
                        path: file, 
                        mtime: stats.mtime 
                    };
                })
            );
            
            filesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
            
            // Paginate the files
            const totalFiles = filesWithStats.length;
            const startIndex = (page - 1) * fileLimit;
            const endIndex = Math.min(startIndex + fileLimit, totalFiles);
            
            // Get the files for the current page
            const logFiles = filesWithStats
                .slice(startIndex, endIndex)
                .map(file => file.path);
            
            if (logFiles.length === 0) {
                return {
                    toolResult: {
                        success: false,
                        message: `No log files found in ${logDir}`,
                        logDirectory: logDir
                    }
                };
            }
            
            const results: Record<string, string> = {};
            
            // Process each log file - with size limiting
            const maxBytesPerFile = 100 * 1024; // 100KB per file max
            const maxTotalBytes = 500 * 1024; // 500KB total max
            let totalSize = 0;
            
            for (const logFile of logFiles) {
                try {
                    // Check if we've already exceeded total max size
                    if (totalSize >= maxTotalBytes) {
                        const filename = path.basename(logFile);
                        results[filename] = "[Log content skipped due to total size limits]";
                        continue;
                    }
                    
                    const filename = path.basename(logFile);
                    const content = await readFile(logFile, 'utf8');
                    
                    // Split content into lines
                    let logLines = content.split(/\r?\n/);
                    
                    // Apply filter if provided
                    if (filter) {
                        const filterLower = filter.toLowerCase();
                        logLines = logLines.filter(line => 
                            line.toLowerCase().includes(filterLower)
                        );
                    }
                    
                    // Get the specified number of lines from the end
                    const selectedLines = logLines.slice(-lines);
                    const selectedContent = selectedLines.join('\n');
                    
                    // Check if this file would exceed per-file limit
                    if (Buffer.from(selectedContent).length > maxBytesPerFile) {
                        // Take just enough lines to stay under the limit
                        let truncatedContent = '';
                        let truncatedLines = [];
                        for (let i = selectedLines.length - 1; i >= 0; i--) {
                            const newLine = selectedLines[i] + '\n';
                            if (Buffer.from(newLine + truncatedContent).length <= maxBytesPerFile) {
                                truncatedLines.unshift(selectedLines[i]);
                                truncatedContent = truncatedLines.join('\n');
                            } else {
                                break;
                            }
                        }
                        
                        results[filename] = '[Content truncated due to size limits]\n' + truncatedContent;
                        totalSize += Buffer.from(results[filename]).length;
                    } else {
                        // Store the results if under limit
                        results[filename] = selectedContent;
                        totalSize += Buffer.from(selectedContent).length;
                    }
                } catch (readError) {
                    const errorMessage = readError instanceof Error ? readError.message : String(readError);
                    results[path.basename(logFile)] = `Error reading log: ${errorMessage}`;
                    totalSize += Buffer.from(results[path.basename(logFile)]).length;
                }
            }
            
            return {
                toolResult: {
                    success: true,
                    message: `Read logs from ${logFiles.length} file(s)`,
                    logDirectory: logDir,
                    logs: results,
                    pagination: {
                        currentPage: page,
                        filesPerPage: fileLimit,
                        totalFiles: totalFiles,
                        totalPages: Math.ceil(totalFiles / fileLimit),
                        hasNextPage: endIndex < totalFiles,
                        hasPreviousPage: page > 1
                    }
                }
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await saveLog(`Error reading MCP logs: ${errorMessage}`);
            
            throw new McpError(ErrorCode.InternalError, `Failed to read MCP logs: ${errorMessage}`);
        }
    }
    
    throw new McpError(ErrorCode.MethodNotFound, "Tool not found");
});