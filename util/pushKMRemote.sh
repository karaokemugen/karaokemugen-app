source util/versionUtil.sh

lftp -c "set cmd:fail-exit yes; set ftp:ssl-allow no; open -u $USERNAME,$PASSWORD $HOST; lcd kmfrontend/dist; cd srv/kmremote-releases; set cmd:fail-exit no; mkdir -f $BUILDVERSION; set cmd:fail-exit yes; cd $BUILDVERSION; mirror -Rnev --parallel=10"

cd kmfrontend/dist

zip -r $BUILDVERSION.zip .

lftp -c "set cmd:fail-exit yes; set ftp:ssl-allow no; open -u $USERNAME,$PASSWORD $KARAOKESMOE; cd www/mugen.karaokes.moe/frontends; set cmd:fail-exit yes; put -e $BUILDVERSION.zip"
