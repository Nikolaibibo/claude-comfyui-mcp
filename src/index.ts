#!/usr/bin/env node

import { ComfyUIMCPServer } from './server.js';

async function main() {
  try {
    const server = new ComfyUIMCPServer();
    await server.run();
  } catch (error) {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

main();
