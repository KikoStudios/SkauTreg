import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const keyPath = path.resolve('jwt.key');

try {
    console.log(`Reading key from: ${keyPath}`);
    // Read as utf8 and trim whitespace
    const keyContent = fs.readFileSync(keyPath, 'utf8').trim();

    console.log(`Key length: ${keyContent.length}`);

    // We send the key AS IS because it contains literal \n which is safe for command line args typically,
    // and our backend code handles finding literal \n and replacing them.

    console.log('Setting JWT_PRIVATE_KEY in Convex environment...');

    // Use npx (cmd on windows)
    const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    const child = spawn(cmd, ['convex', 'env', 'set', 'JWT_PRIVATE_KEY', keyContent], {
        stdio: 'inherit',
        shell: true // Needed for npx resolution sometimes
    });

    child.on('close', (code) => {
        if (code === 0) {
            console.log('Successfully set JWT_PRIVATE_KEY');
        } else {
            console.error(`Failed to set JWT_PRIVATE_KEY. Exit code: ${code}`);
        }
    });

} catch (err) {
    console.error("Failed:", err.message);
}
