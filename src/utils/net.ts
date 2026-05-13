import { createConnection } from 'net';

function tryConnect(timeout: number): Promise<boolean> {
    return new Promise(resolve => {
        const socket = createConnection({ host: '1.1.1.1', port: 53 });
        socket.setTimeout(timeout);
        socket.on('connect', () => { socket.destroy(); resolve(true); });
        socket.on('error', () => resolve(false));
        socket.on('timeout', () => resolve(false));
    });
}

// Check if internet is available. Creates a connection and returns an error if it fails or timeouts. Maybe the timeout and retries will need adjustments
export async function checkInternet(): Promise<void> {
    const timeout = 2000;
    const retries = 5;

    for (let i = 0; i < retries; i++) {
        if (await tryConnect(timeout)) return;
    }

    throw new Error('No internet');
}