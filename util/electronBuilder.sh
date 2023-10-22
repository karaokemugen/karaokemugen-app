source util/versionUtil.sh

ELECTRONBUILDER=$(which electron-builder)

if [ $(uname) == 'Darwin' ]
then
	ELECTRONBUILDER=/opt/homebrew/bin/electron-builder
fi

$ELECTRONBUILDER $1 --publish always -c.extraMetadata.version=$BUILDVERSION
