source util/versionUtil.sh

cd kmfrontend/dist

zip -r $BUILDVERSION.zip .

lftp -c "set cmd:fail-exit yes; set ftp:ssl-allow no; open -u $USERNAME,$PASSWORD $KARAOKESMOE; cd www/mugen.karaokes.moe/frontends; set cmd:fail-exit yes; put -e $BUILDVERSION.zip"
