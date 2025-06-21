import { execa } from 'execa';
import { readFile, unlink, writeFile } from 'fs/promises';
import { resolve } from 'path';

import { resolvedPath } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import { fileExists } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';

const service = 'SSH';

export async function generateSSHKey(repoName: string, username: string) {
	const keyFile = getKeyFileName(repoName);
	await removeSSHKey(keyFile, username);
	try {
		await execa('ssh-keygen', ['-t', 'ed25519', '-f', keyFile, '-q', '-C', `${username}@${repoName}`, '-N', '']);
	} catch (err) {
		logger.error(`Unable to generate SSH keypair : ${err}`, { service, obj: err });
		logger.error(`ssh-keygen STDERR: ${err.stderr}`, { service });
		logger.error(`ssh-keygen STDOUT: ${err.stdout}`, { service });
		throw err;
	}
}

export async function removeSSHKey(repoName: string, username: string) {
	const keyFile = getKeyFileName(repoName, username);
	logger.debug(`Trying to remove ${keyFile}`, { service });
	if (await fileExists(keyFile, true)) {
		await unlink(keyFile);
		logger.debug(`Removed ${keyFile}`, { service });
	} else {
		// Try with key without username
		const keyFileWithoutUsername = getKeyFileName(repoName);
		try {
			await unlink(keyFileWithoutUsername);
			logger.debug(`Removed ${keyFileWithoutUsername}`, { service });
		} catch (_) {
			// Non fatal.
		}
	}
	logger.debug(`Trying to remove ${keyFile}.pub`, { service });
	if (await fileExists(`${keyFile}.pub`, true)) {
		await unlink(`${keyFile}.pub`);
		logger.debug(`Removed ${keyFile}.pub`, { service });
	} else {
		// Try with key without username
		const keyFileWithoutUsername = getKeyFileName(repoName);
		try {
			await unlink(`${keyFileWithoutUsername}.pub`);
			logger.debug(`Removed ${keyFileWithoutUsername}.pub`, { service });
		} catch (_) {
			// Non fatal.
		}
	}
}

export function getKeyFileName(repoName: string, username?: string) {
	const key = resolve(resolvedPath('SSHKeys'), `KaraokeMugen_${repoName}${username ? `_${username}` : ''}`);
	logger.debug(`Private key selected: ${key}`, { service });
	return key;
}

export function getKnownHostsFileName(repoName: string) {
	const knownHostsFile = resolve(resolvedPath('SSHKeys'), `known_hosts_KaraokeMugen_${repoName}`);
	logger.debug(`Known hosts file selected: ${knownHostsFile}`);
	return knownHostsFile;
}

export async function getSSHPubKey(repoName: string, username: string): Promise<string> {
	try {
		const keyFile = getKeyFileName(repoName, username);
		let pubKey = '';
		try {
			pubKey = await readFile(`${keyFile}.pub`, 'utf-8');
		} catch (_) {
			// We try again without the username
			pubKey = await readFile(`${getKeyFileName(repoName)}.pub`, 'utf-8');
		}
		logger.debug(`Public key selected: ${keyFile}`, { service });
		return pubKey;
	} catch (err) {
		throw new ErrorKM('SSH_PUBLIC_KEY_NOT_FOUND', 404, false);
	}
}

export async function updateKnownHostsFile(repoURL: string, repoName: string) {
	// We need two things :
	const host = repoURL.split('@')[1].split(':')[0];
	const knownHostsFile = getKnownHostsFileName(repoName);
	try {
		await execa('ssh-keygen', ['-q', '-f', knownHostsFile, '-F', host]);
	} catch (_) {
		logger.debug(`Scanning key for host ${host}`, { service });
		const { stdout } = await execa('ssh-keyscan', ['-t', 'rsa,ed25519', host]);
		const hostSignature = stdout;
		logger.debug(`Finished scanning key for host ${host}`);
		await writeFile(knownHostsFile, hostSignature, 'utf-8');
	}
}
