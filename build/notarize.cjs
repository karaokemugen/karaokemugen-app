const { notarize } = require('@electron/notarize');

exports.default = async function notarizing(context) {
	const { electronPlatformName, appOutDir } = context;
	if (electronPlatformName !== 'darwin' || process.env.SKIP_NOTARIZE) {
		return;
	}

	const appName = context.packager.appInfo.productFilename;

	return await notarize({
		appBundleId: 'moe.karaokes.mugen',
		appPath: `${appOutDir}/${appName}.app`,
		appleId: process.env.APPLEID,
		appleIdPassword: process.env.APPLEIDPASS,
		tool: 'notarytool',
		teamId: process.env.TEAMID,
	});
};
