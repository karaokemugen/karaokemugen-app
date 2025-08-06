// Taken from this PR https://github.com/gergof/electron-builder-sandbox-fix/pull/2

const fs = require('fs/promises');
const path = require('path');

const log = message => {
	console.log(`  • ${message}`);
};

const afterPackHook = async params => {
	if (params.electronPlatformName !== 'linux') {
		// this fix is only required on linux
		return;
	}

	log('applying fix for sandboxing on unsupported kernels');

	const executable = path.join(params.appOutDir, params.packager.executableName);

	const loaderScript = `#!/usr/bin/env bash
set -u

UNPRIVILEGED_USERNS_ENABLED=$(cat /proc/sys/kernel/unprivileged_userns_clone 2>/dev/null)
RESTRICT_UNPRIVILEGED_USERNS=$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns 2>/dev/null)
SCRIPT_DIR="$( cd "$( dirname "\${BASH_SOURCE[0]}" )" && pwd )"

!([ "$UNPRIVILEGED_USERNS_ENABLED" != 1 ] || [ "$RESTRICT_UNPRIVILEGED_USERNS" == 1 ])
APPLY_NO_SANDBOX_FLAG=$?

if [ "$SCRIPT_DIR" == "/usr/bin" ]; then
	SCRIPT_DIR="/opt/${params.packager.appInfo.productName}"
fi

if [ "$APPLY_NO_SANDBOX_FLAG" == 1 ]; then
	echo "Note: Running with --no-sandbox since unprivileged_userns_clone is disabled or apparmor_restrict_unprivileged_userns is enabled."
fi

exec "$SCRIPT_DIR/${params.packager.executableName}.bin" "$([ "$APPLY_NO_SANDBOX_FLAG" == 1 ] && echo '--no-sandbox')" "$@"
`;

	try {
		await fs.rename(executable, executable + '.bin');
		await fs.writeFile(executable, loaderScript);
		await fs.chmod(executable, 0o755);
	} catch (e) {
		log('failed to create loder for sandbox fix: ' + e.message);
		throw new Error('Failed to create loader for sandbox fix');
	}

	log('sandbox fix successfully applied');
};

module.exports = afterPackHook;
