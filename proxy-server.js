#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { URL } = require('url');

const PORT = 5050;

const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    let body = '';
    
    req.on('data', chunk => {
        body += chunk.toString();
    });
    
    req.on('end', () => {
        let targetUrl;
        
        if (req.method === 'POST') {
            targetUrl = body.trim();
        } else if (req.method === 'GET') {
            const url = new URL(req.url, `http://localhost:${PORT}`);
            targetUrl = url.searchParams.get('url');
        }
        
        if (!targetUrl) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing URL' }));
            return;
        }
        
        console.log(`Proxying: ${targetUrl}`);
        
        const parsedUrl = new URL(targetUrl);
        
        const options = {
            hostname: parsedUrl.hostname,
            port: parsedUrl.port || 443,
            path: parsedUrl.pathname + parsedUrl.search,
            method: 'GET',
            headers: {
                'accept': 'application/json, text/plain, */*',
                'accept-language': 'en-US,en;q=0.9,en-GB;q=0.8,en-AU;q=0.7',
                'accept-encoding': 'gzip, deflate, br',
                'cache-control': 'no-cache',
                'pragma': 'no-cache',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"macOS"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'User-Agent': getRandomUserAgent(),
                'referer': 'https://chordify.net/',
                'origin': 'https://chordify.net',
            }
        };
        
        const proxyReq = https.request(options, (proxyRes) => {
            let data = '';
            
            proxyRes.on('data', (chunk) => {
                data += chunk;
            });
            
            proxyRes.on('end', () => {
                if (proxyRes.statusCode === 200) {
                    try {
                        const jsonData = JSON.parse(data);
                        console.log(`Success: ${jsonData.title || 'No title'}`);
                        res.writeHead(200, { 
                            'Content-Type': 'application/json',
                            'Access-Control-Allow-Origin': '*'
                        });
                        res.end(JSON.stringify(jsonData));
                    } catch (e) {
                        console.error('Invalid JSON response');
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid response from Chordify' }));
                    }
                } else {
                    console.error(`Chordify returned ${proxyRes.statusCode}`);
                    res.writeHead(500, { 
                        'Content-Type': 'application/json',
                        'Access-Control-Allow-Origin': '*'
                    });
                    res.end(JSON.stringify({ error: `Chordify returned ${proxyRes.statusCode}` }));
                }
            });
        });
        
        proxyReq.on('error', (e) => {
            console.error(`Request error: ${e.message}`);
            res.writeHead(500, { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            });
            res.end(JSON.stringify({ error: e.message }));
        });
        
        proxyReq.end();
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Node.js proxy server running on http://localhost:${PORT}`);
});
