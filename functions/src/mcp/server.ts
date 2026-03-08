import * as functions from 'firebase-functions';
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

const app = express();
app.use(cors({ origin: true }));

// Create the Demo MCP server
const mcp = new McpServer({
  name: "etar-demo-server",
  version: "1.0.0"
});

// Configure the MCP Server tool: get_synthetic_device
mcp.tool("get_synthetic_device",
  "Fetches synthetic demo data for an emelőgép (lifting equipment) to showcase ETAR capabilities.",
  { device_id: z.string().optional() },
  async ({ device_id }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          status: "SUCCESS",
          device: {
            id: device_id || "ETAR-DEMO-001",
            type: "Híddaru",
            manufacturer: "Demag",
            capacity_kg: 5000,
            nfc_tag_uid: "04:3A:5B:21:8F:7C:90",
            last_inspection: {
              date: "2024-01-15T08:00:00Z",
              type: "Fővizsgálat",
              result: "MEGFELELT",
              inspector: "Demo Szakértő János"
            },
            next_inspection_due: "2025-01-15T08:00:00Z"
          },
          note: "This is synthetic demo data provided by the ETAR MCP API."
        }, null, 2)
      }]
    };
  }
);

// Configure the MCP Server tool: get_demo_inspection_report
mcp.tool("get_demo_inspection_report",
  "Retrieves a synthetic demo inspection report (Jegyzőkönyv) to demonstrate the unchangeable data structure.",
  { report_id: z.string().optional() },
  async ({ report_id }) => {
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          audit_id: report_id || "REP-2024-X99",
          status: "LOCKED",
          timestamp: "2024-01-15T09:30:00Z",
          integrity_check: "PASSED",
          data: {
            device_id: "ETAR-DEMO-001",
            condition_notes: "A drótkötél állapota megfelelő, szálszakadás nem tapasztalható. A fékek tesztelése névleges terheléssel (1.25x) sikeresen lezajlott.",
            blockchain_hash: "a8f5f167f44f4964e6c998dee827110c"
          }
        }, null, 2)
      }]
    };
  }
);

let transport: SSEServerTransport;

// Endpoint for AI agents to connect to the SSE stream
app.get('/sse', async (req, res) => {
  transport = new SSEServerTransport("/mcp/messages", res);
  await mcp.connect(transport);
});

// Endpoint for AI agents to post messages (tool execution) to the active SSE transport
app.post('/messages', async (req, res) => {
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(503).send('SSE Connection not established. Please connect to /sse first.');
  }
});

// Default status for humans stumbling upon this URL
app.get('/', (req, res) => {
  res.send('ETAR MCP Demo Server is active. AI Agents should connect to the /sse endpoint.');
});

export const mcpServerApp = functions.https.onRequest(app);
