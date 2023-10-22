#!/bin/bash
# Detects if we're running on a master or next release or tag release.
# if not master or next, it's tag

if [ "$CI_COMMIT_REF_NAME" = "master" ] || [ "$CI_COMMIT_REF_NAME" = "next" ]
then
	export BUILDVERSION=$(grep version\": package.json | awk -F\" {'print $4'})
	export RELEASE=$CI_COMMIT_REF_NAME
else
	export BUILDVERSION=$(echo "$CI_COMMIT_REF_NAME" | awk -F- {'print $1'} | sed 's/v//g')
	if [ "$BUILDVERSION" = "" ] 
	then
		export BUILDVERSION=$(grep version\": package.json | awk -F\" {'print $4'})
	fi
	export RELEASE="release"
fi

export VERSION_NAME=$(grep versionName\": package.json | awk -F\" {'print $4'})
echo "Channel       : $RELEASE"
echo "Version number: $BUILDVERSION"
echo "Version name  : $VERSION_NAME"
