VERSION=`cat package.json | grep version\": | awk -F\" {'print $4'} | awk -F- {'print $1'}`;

MAJORVERSION=`echo $VERSION | awk -F. {'print $1'}`;
MIDDLEVERSION=`echo $VERSION | awk -F. {'print $2'}`;
MINORVERSION=`echo $VERSION | awk -F. {'print $3'}`;

MINORVERSION=$((MINORVERSION+1))

NEWVERSION="$MAJORVERSION.$MIDDLEVERSION.$MINORVERSION"

sed -ri "s/number: '([0-9.]+)(-[a-z]+)?',/number: '$NEWVERSION\2',/" src/version.ts
sed -ri "s/\"version\": \"([0-9.]+)(-[a-z]+)?\"/\"version\": \"$NEWVERSION\2\",/" package.json