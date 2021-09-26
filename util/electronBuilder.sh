source util/versionUtil.sh

/usr/local/bin/electron-builder $1 --publish always -c.extraMetadata.version=$BUILDVERSION
