source util/versionUtil.sh

lftp -u $USERNAME,$PASSWORD $KARAOKESMOE <<__CMD__
  set cmd:fail-exit yes
  cls www/mugen.karaokes.moe/downloads/ | grep -- "-$RELEASE" | grep -v -- "$BUILDVERSION" | sed -e 's/^/\"/g' | sed -e 's/$/\"/g' | xargs -0 -I{} echo "{}" | sed 's/^/rm\ /g' >> rm_list.txt
__CMD__

# Remove last line
sed -i '$ d' rm_list.txt

cat rm_list.txt

lftp -u $USERNAME,$PASSWORD $KARAOKESMOE <<__CMD__
  set cmd:fail-exit yes
  source rm_list.txt
__CMD__

rm rm_list.txt