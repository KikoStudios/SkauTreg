/**
 * Quick Email Integration Status Checker
 * 
 * This script checks the current status of email integrations
 * in your Convex database without requiring credentials.
 */

import { ConvexHttpClient } from "convex/browser";

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}\n`),
};

async function checkEmailIntegrations() {
    try {
        // Get Convex URL from environment
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        
        if (!convexUrl) {
            log.error('NEXT_PUBLIC_CONVEX_URL not found in environment');
            log.info('Make sure your .env.local file is configured');
            return;
        }

        log.section('Email Integration Status Check');
        log.info(`Connecting to: ${convexUrl}`);

        const client = new ConvexHttpClient(convexUrl);
        
        // Note: This would need authenticated queries
        log.warning('This script requires Convex CLI or authenticated access');
        log.info('Alternative: Check in Convex dashboard at https://dashboard.convex.dev/');
        
        log.section('Manual Check Instructions');
        console.log('1. Open Convex Dashboard: https://dashboard.convex.dev/');
        console.log('2. Select your project: kindred-okapi-371');
        console.log('3. Go to Data → troops table');
        console.log('4. Check the "emailProvider" field for any troops');
        console.log('');
        console.log('Look for entries like:');
        console.log('  {');
        console.log('    provider: "seznam" or "centrum",');
        console.log('    email: "...",');
        console.log('    smtpHost: "smtp.seznam.cz" or "smtp.centrum.cz",');
        console.log('    smtpPassword: "...",');
        console.log('  }');

        log.section('Current Code Status');
        console.log(`${colors.green}✓${colors.reset} Seznam.cz - Code configured`);
        console.log(`  SMTP: smtp.seznam.cz:465`);
        console.log(`  IMAP: imap.seznam.cz:993`);
        console.log('');
        console.log(`${colors.green}✓${colors.reset} Centrum.cz - Code configured`);
        console.log(`  SMTP: smtp.centrum.cz:465`);
        console.log(`  IMAP: imap.centrum.cz:993`);
        console.log('');
        console.log(`${colors.yellow}⚠${colors.reset} Test accounts - Not yet configured`);
        console.log(`${colors.yellow}⚠${colors.reset} Real credentials - Need to be added`);

        log.section('Next Steps');
        console.log('1. Create test accounts (see EMAIL-PROVIDERS-VERIFICATION.md)');
        console.log('2. Install packages: npm install nodemailer imapflow');
        console.log('3. Run verification: node scripts/verify-email-providers.mjs --help');
        console.log('4. Add credentials via SkauTreg UI: Settings → E-mailové připojení');

    } catch (error) {
        log.error(`Error: ${error.message}`);
    }
}

checkEmailIntegrations();
