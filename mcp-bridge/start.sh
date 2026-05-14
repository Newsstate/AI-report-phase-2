#!/bin/bash
echo "Installing MCP Bridge dependencies..."
npm install
echo ""
echo "Starting MCP Bridge Server..."
node server.js
