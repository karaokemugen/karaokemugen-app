source util/versionUtil.sh

lftp -u $USERNAME,$PASSWORD $KARAOKESMOE <<__CMD__
  set cmd:fail-exit yes
  cls www/mugen.karaokes.moe/downloads/ | grep -- "-$RELEASE" | grep -v -- "$BUILDVERSION" | xargs -I{} echo rm "{}" > rm_list.txt
  source rm_list.txt
__CMD__

echo rm_list.txt
rm rm_list.txt