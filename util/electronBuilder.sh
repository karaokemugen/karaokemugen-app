source util/versionUtil.sh

yarn electron-builder $1 --publish always -c.extraMetadata.version=$BUILDVERSION
