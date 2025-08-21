private setupRoutes() {
    // Health check endpoint
    this.app.get('/', (req, res) => {
      res.json({
        name: 'Apprendo MCP Server',
        status: 'running',
        books: this.books.length,
        version: '1.0.0',
        endpoints: {
          health: '/',
          mcp: '/mcp',
          sse: '/sse'
        }
      });
    });
  
    // Standard MCP HTTP endpoint
    this.app.post('/mcp', express.json(), async (req, res) => {
      try {
        // Handle MCP requests here
        res.json({ 
          jsonrpc: '2.0',
          result: { message: 'MCP endpoint active' }
        });
      } catch (error) {
        res.status(500).json({ error: 'MCP processing failed' });
      }
    });
  
    // MCP SSE endpoint  
    this.app.get('/sse', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      res.write('data: {"type": "connection", "status": "connected"}\n\n');
      
      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write('data: {"type": "ping"}\n\n');
      }, 30000);
      
      req.on('close', () => {
        clearInterval(keepAlive);
      });
    });
  }