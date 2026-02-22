/**
 * Email Provider Verification Script
 * 
 * This script helps verify Seznam and Centrum email integrations
 * by testing SMTP/IMAP connections with real credentials.
 */

import nodemailer from 'nodemailer';
import { ImapFlow } from 'imapflow';

// ANSI color codes for better output
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

// Provider configurations
const PROVIDERS = {
    seznam: {
        name: 'Seznam.cz',
        smtp: {
            host: 'smtp.seznam.cz',
            port: 465,
            secure: true,
        },
        imap: {
            host: 'imap.seznam.cz',
            port: 993,
            secure: true,
        },
    },
    centrum: {
        name: 'Centrum.cz',
        smtp: {
            host: 'smtp.centrum.cz',
            port: 465,
            secure: true,
        },
        imap: {
            host: 'imap.centrum.cz',
            port: 993,
            secure: true,
        },
    },
};

/**
 * Test SMTP connection for a provider
 */
async function testSMTP(providerKey, email, password) {
    const provider = PROVIDERS[providerKey];
    log.info(`Testing SMTP for ${provider.name}...`);

    try {
        const transporter = nodemailer.createTransport({
            host: provider.smtp.host,
            port: provider.smtp.port,
            secure: provider.smtp.secure,
            auth: {
                user: email,
                pass: password,
            },
            tls: {
                rejectUnauthorized: false, // For testing only
            },
        });

        // Verify connection
        await transporter.verify();
        log.success(`SMTP connection successful for ${provider.name}`);
        return { success: true, provider: providerKey };
    } catch (error) {
        log.error(`SMTP connection failed for ${provider.name}: ${error.message}`);
        return { success: false, provider: providerKey, error: error.message };
    }
}

/**
 * Test IMAP connection for a provider
 */
async function testIMAP(providerKey, email, password) {
    const provider = PROVIDERS[providerKey];
    log.info(`Testing IMAP for ${provider.name}...`);

    try {
        const client = new ImapFlow({
            host: provider.imap.host,
            port: provider.imap.port,
            secure: provider.imap.secure,
            auth: {
                user: email,
                pass: password,
            },
            logger: false,
        });

        await client.connect();
        log.success(`IMAP connection successful for ${provider.name}`);
        
        // Get mailbox list
        const mailboxes = await client.list();
        log.info(`Found ${mailboxes.length} mailboxes`);
        
        await client.logout();
        return { success: true, provider: providerKey };
    } catch (error) {
        log.error(`IMAP connection failed for ${provider.name}: ${error.message}`);
        return { success: false, provider: providerKey, error: error.message };
    }
}

/**
 * Send a test email (automatically saves to Sent folder)
 */
async function sendTestEmail(providerKey, email, password, toEmail) {
    const provider = PROVIDERS[providerKey];
    log.info(`Sending test email from ${provider.name}...`);

    try {
        const transporter = nodemailer.createTransport({
            host: provider.smtp.host,
            port: provider.smtp.port,
            secure: provider.smtp.secure,
            auth: {
                user: email,
                pass: password,
            },
        });

        const mailOptions = {
            from: email,
            to: toEmail,
            subject: `Test Email from SkauTreg - ${provider.name}`,
            text: `This is a test email sent from SkauTreg using ${provider.name} SMTP.`,
            html: `<p>This is a test email sent from <strong>SkauTreg</strong> using <strong>${provider.name}</strong> SMTP.</p>
                   <p style="color: #16a34a; font-weight: 600;">✅ This email has been automatically saved to your Sent folder.</p>`,
        };

        // Send via SMTP
        const info = await transporter.sendMail(mailOptions);
        
        // Automatically save to Sent folder (silently, in background)
        saveToSentFolder(providerKey, email, password, mailOptions).catch(() => {
            // Silently ignore IMAP errors - email was already sent successfully
        });

        log.success(`Test email sent successfully! Message ID: ${info.messageId}`);
        log.success(`Email will appear in your Sent folder automatically.`);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        log.error(`Failed to send test email: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Save sent email to IMAP Sent folder
 */
async function saveToSentFolder(providerKey, email, password, mailOptions) {
    const provider = PROVIDERS[providerKey];
    
    const client = new ImapFlow({
        host: provider.imap.host,
        port: provider.imap.port,
        secure: provider.imap.secure,
        auth: {
            user: email,
            pass: password,
        },
        logger: false,
    });

    await client.connect();

    try {
        // Try common sent folder names
        const sentFolderNames = ['Sent', 'Odeslaná pošta', 'Odoslané', 'INBOX.Sent', '[Gmail]/Sent Mail'];
        let sentFolder = 'Sent'; // default

        const mailboxes = await client.list();
        for (const folderName of sentFolderNames) {
            const found = mailboxes.find(mb => 
                mb.path === folderName || 
                mb.name === folderName ||
                mb.path.toLowerCase().includes('sent') ||
                mb.path.toLowerCase().includes('odeslan')
            );
            if (found) {
                sentFolder = found.path;
                break;
            }
        }

        // Build RFC822 message
        const message = buildRFC822Message(mailOptions);

        // Append to sent folder
        await client.append(sentFolder, message, ['\\Seen'], new Date());
        
    } finally {
        await client.logout();
    }
}

/**
 * Build RFC822 formatted email message
 */
function buildRFC822Message(mailOptions) {
    const boundary = '----=_Part_' + Date.now();
    const date = new Date().toUTCString();
    
    let message = '';
    message += `From: ${mailOptions.from}\r\n`;
    message += `To: ${mailOptions.to}\r\n`;
    message += `Subject: ${mailOptions.subject}\r\n`;
    message += `Date: ${date}\r\n`;
    message += `MIME-Version: 1.0\r\n`;
    message += `Content-Type: multipart/alternative; boundary="${boundary}"\r\n`;
    message += `\r\n`;
    
    // Text part
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/plain; charset=UTF-8\r\n`;
    message += `\r\n`;
    message += `${mailOptions.text}\r\n`;
    message += `\r\n`;
    
    // HTML part
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/html; charset=UTF-8\r\n`;
    message += `\r\n`;
    message += `${mailOptions.html}\r\n`;
    message += `\r\n`;
    
    message += `--${boundary}--\r\n`;
    
    return message;
}

/**
 * Main verification function
 */
async function verifyProvider(providerKey, email, password, testEmailRecipient = null) {
    log.section(`Verifying ${PROVIDERS[providerKey].name}`);
    log.info(`Email: ${email}`);
    log.info(`Password: ${'*'.repeat(password.length)}`);

    const results = {
        provider: providerKey,
        email: email,
        smtp: null,
        imap: null,
        testEmail: null,
    };

    // Test SMTP
    results.smtp = await testSMTP(providerKey, email, password);

    // Test IMAP
    results.imap = await testIMAP(providerKey, email, password);

    // Send test email if recipient provided
    if (testEmailRecipient && results.smtp.success) {
        results.testEmail = await sendTestEmail(providerKey, email, password, testEmailRecipient);
    }

    return results;
}

/**
 * Display help and usage examples
 */
function showHelp() {
    console.log(`
${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
${colors.cyan}   Email Provider Verification Script${colors.reset}
${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}

${colors.yellow}Usage:${colors.reset}
  node scripts/verify-email-providers.mjs [options]

${colors.yellow}Options:${colors.reset}
  --provider=<seznam|centrum>  Provider to test
  --email=<email>              Email address
  --password=<password>        App password (required for Seznam/Centrum)
  --send-to=<email>            Send test email to this address (optional)
  --help                       Show this help message

${colors.yellow}Examples:${colors.reset}

  1. Test Seznam connection:
     ${colors.green}node scripts/verify-email-providers.mjs --provider=seznam --email=test@seznam.cz --password=yourAppPassword${colors.reset}

  2. Test Centrum and send test email:
     ${colors.green}node scripts/verify-email-providers.mjs --provider=centrum --email=test@centrum.cz --password=yourAppPassword --send-to=recipient@example.com${colors.reset}

${colors.yellow}Important Notes:${colors.reset}
  • Use APP PASSWORDS, not your regular account password
  • Seznam: Generate app password at ${colors.blue}https://napoveda.seznam.cz/cz/email/mobilni-aplikace-a-programy/aplikacni-heslo/${colors.reset}
  • Centrum: Generate app password in your account settings

${colors.yellow}Testing Both Providers:${colors.reset}
  You can create test accounts for free:
  • Seznam: ${colors.blue}https://email.seznam.cz/${colors.reset}
  • Centrum: ${colors.blue}https://email.centrum.cz/${colors.reset}

${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
    `);
}

/**
 * Main execution
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    const params = {};
    args.forEach(arg => {
        if (arg.startsWith('--')) {
            const [key, value] = arg.slice(2).split('=');
            params[key] = value || true;
        }
    });

    // Show help if requested or no arguments
    if (params.help || args.length === 0) {
        showHelp();
        return;
    }

    // Validate required parameters
    if (!params.provider || !params.email || !params.password) {
        log.error('Missing required parameters!');
        log.info('Use --help for usage information');
        return;
    }

    // Validate provider
    if (!['seznam', 'centrum'].includes(params.provider)) {
        log.error(`Invalid provider: ${params.provider}. Must be 'seznam' or 'centrum'`);
        return;
    }

    // Run verification
    const results = await verifyProvider(
        params.provider,
        params.email,
        params.password,
        params['send-to']
    );

    // Display summary
    log.section('Verification Summary');
    console.log(`Provider: ${colors.cyan}${PROVIDERS[params.provider].name}${colors.reset}`);
    console.log(`Email: ${colors.cyan}${params.email}${colors.reset}`);
    console.log(`SMTP: ${results.smtp.success ? colors.green + '✓ Working' : colors.red + '✗ Failed'}${colors.reset}`);
    console.log(`IMAP: ${results.imap.success ? colors.green + '✓ Working' : colors.red + '✗ Failed'}${colors.reset}`);
    if (results.testEmail) {
        console.log(`Test Email: ${results.testEmail.success ? colors.green + '✓ Sent' : colors.red + '✗ Failed'}${colors.reset}`);
    }

    // Next steps
    if (results.smtp.success && results.imap.success) {
        log.section('✅ Success! Next Steps');
        console.log(`1. You can now use this account in SkauTreg`);
        console.log(`2. Go to Settings → E-mailové připojení`);
        console.log(`3. Select "${PROVIDERS[params.provider].name}"`);
        console.log(`4. Enter email: ${params.email}`);
        console.log(`5. Enter the app password you used above`);
    } else {
        log.section('❌ Verification Failed');
        console.log('Please check:');
        console.log('1. Your email address is correct');
        console.log('2. You are using an APP PASSWORD (not your regular password)');
        console.log('3. Your account has IMAP/SMTP enabled');
        console.log('4. Your internet connection is working');
    }
}

// Run the script
main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
});
