source util/versionUtil.sh

curl -X POST -F "variables[RELEASE]=$RELEASE" -F "variables[VERSIONNAME]=$VERSION_NAME" -F "variables[VERSIONNUMBER]=$BUILDVERSION" -F "token=$TRIGGERWEB" -F "ref=master" "https://gitlab.com/api/v4/projects/32123824/trigger/pipeline"
