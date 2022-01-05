source util/versionUtil.sh

lftp -c "set cmd:fail-exit yes; set ftp:ssl-allow no; open -u $USERNAME,$PASSWORD $HOST; lcd kmfrontend/build; cd srv/kmremote-releases; set cmd:fail-exit no; mkdir -f $BUILDVERSION; set cmd:fail-exit yes; cd $BUILDVERSION; mirror -Rnev --parallel=10"
