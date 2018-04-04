# Script used to edit .JSON files in place on Karaoke Mugen's website'

# Define which release we're on

OS=$1

case $CI_COMMIT_REF_NAME in
"master" | "next")	
	VERSION=$CI_COMMIT_SHA
	RELEASE=$CI_COMMIT_REF_NAME
	;;
*)
	# Other means we're on a tag
	VERSION=$CI_COMMIT_REF_NAME
	RELEASE="stable"
	;;
esac

OUTFILE="$RELEASE.$OS.json"
cp -f $OS.template.json $OUTFILE
if [ $? -ne 0 ] 
then
	echo "ERROR: failed creating file from template"
	exit 1
fi 

sed "s/_NEWVERSION/$VERSION/g" -i $OUTFILE
sed "s/_RELEASE/$CI_COMMIT_REF_NAME/g" -i $OUTFILE

echo $OUTFILE