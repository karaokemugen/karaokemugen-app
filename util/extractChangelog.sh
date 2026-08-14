#!/bin/bash

# Extract changelog for a specific version
# $1 = Version number.
# $2 = CHANGELOG file

VERSION=$(echo $1 | sed 's/v//g')
CHANGELOG=$2

awk -v ver="[$VERSION]" '
 /^# / { if (p) { exit }; if ($2 == ver) { p=1; next } } p
' $2