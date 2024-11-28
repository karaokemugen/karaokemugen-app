import { execa } from 'execa';
import { readFile, unlink, writeFile } from 'fs/promises';
import { resolve } from 'path';

import { resolvedPath } from '../lib/utils/config.js';
import { ErrorKM } from '../lib/utils/error.js';
import { fileExists } from '../lib/utils/files.js';
import logger from '../lib/utils/logger.js';

const service = 'SSH';

export async function generateSSHKey(repoName: string) {
	const keyFile = getKeyFileName(repoName);
	await removeSSHKey(keyFile);
	try {
		await execa('ssh-keygen', ['-b', '2048', '-t', 'rsa', '-f', keyFile, '-q', '-N', '']);
	} catch (err) {
		logger.error(`Unable to generate SSH keypair : ${err}`, { service, obj: err });
		logger.error(`ssh-keygen STDERR: ${err.stderr}`, { service });
		logger.error(`ssh-keygen STDOUT: ${err.stdout}`, { service });
		throw err;
	}
}

export async function removeSSHKey(repoName: string) {
	const keyFile = getKeyFileName(repoName);
	logger.debug(`Trying to remove ${keyFile}`, { service });
	if (await fileExists(keyFile, true)) {
		await unlink(keyFile);
		logger.debug(`Removed ${keyFile}`, { service });
	}
	logger.debug(`Trying to remove ${keyFile}.pub`, { service });
	if (await fileExists(`${keyFile}.pub`, true)) {
		await unlink(`${keyFile}.pub`);
		logger.debug(`Removed ${keyFile}.pub`, { service });
	}
}

function getKeyFileName(repoName: string) {
	return resolve(resolvedPath('SSHKeys'), `id_rsa_KaraokeMugen_${repoName}`);
}

function getKnownHostsFileName(repoName: string) {
	return resolve(resolvedPath('SSHKeys'), `known_hosts_KaraokeMugen_${repoName}`);
}

export async function getSSHPubKey(repoName: string): Promise<string> {
	try {
		const keyFile = getKeyFileName(repoName);
		const pubKey = await readFile(`${keyFile}.pub`, 'utf-8');
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
		const { stdout } = await execa('ssh-keyscan', ['-t', 'rsa', host]);
		const hostSignature = stdout;
		logger.debug(`Finished scanning key for host ${host}`);
		await writeFile(knownHostsFile, hostSignature, 'utf-8');
	}
}
