const http = require('http');

// Keep track of connected mobile clients
let clients = [];

const server = http.createServer((req, res) => {
    // Enable CORS so your mobile web app can connect from any origin
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        return res.end();
    }

    // 1. ENDPOINT FOR MOBILE WEB APP (SSE Stream)
    if (req.url === '/events' && req.method === 'GET') {
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        // Send an initial heartbeat connection message
        res.write('data: {"status": "connected"}\n\n');
        clients.push(res);

        // Remove client when they close the tab or disconnect
        req.on('close', () => {
            clients = clients.filter(client => client !== res);
        });
        return;
    }

    // 2. ENDPOINT FOR SENSORS (Receive Data)
    if (req.url === '/sensor-data' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        
        req.on('end', () => {
            try {
                const sensorPayload = JSON.parse(body);
                
                // Broadcast this sensor data to all connected mobile clients
                clients.forEach(client => {
                    client.write(`data: ${JSON.stringify(sensorPayload)}\n\n`);
                });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
            }
        });
        return;
    }

    // Fallback for unknown routes
    res.writeHead(404);
    res.end();
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Scratch Micro Server running on http://localhost:${PORT}`);
});
