#!/usr/bin/env node

import fs from 'fs';
import { ConvexClient } from 'convex/browser';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node import-bases.mjs <jsonl-file>');
  process.exit(1);
}

const filePath = args[0];
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.error('Error: NEXT_PUBLIC_CONVEX_URL environment variable not set');
  console.error('Make sure you set it to your production URL');
  process.exit(1);
}

const client = new ConvexClient(convexUrl);

async function importBases() {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n');
  
  let imported = 0;
  let failed = 0;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    try {
      const baseData = JSON.parse(line);
      
      // Remove Convex internal fields
      delete baseData._id;
      delete baseData._creationTime;
      
      // Use upsertBase mutation
      await client.mutation('bases:upsertBase', {
        base: baseData
      });
      
      imported++;
      if (imported % 50 === 0) {
        console.log(`Imported ${imported} bases...`);
      }
    } catch (err) {
      failed++;
      if (failed <= 5) {
        console.error(`Failed to import base: ${err.message}`);
      }
    }
  }
  
  console.log(`\n✓ Successfully imported ${imported} bases`);
  if (failed > 0) {
    console.error(`✗ Failed to import ${failed} bases`);
  }
}

importBases().catch(err => {
  console.error('Import failed:', err);
  process.exit(1);
});
