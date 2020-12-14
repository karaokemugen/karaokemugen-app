source util/versionUtil.sh

lftp -c "set cmd:fail-exit yes; set ftp:ssl-allow no; open -u $USERNAME,$PASSWORD $HOST; lcd kmfrontend/build; cd kmremote-releases; mkdir $BUILDVERSION; cd $BUILDVERSION; mirror -Rnev --parallel=10"
