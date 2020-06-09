source util/electronBuilderGetVersion.sh

curl -X POST -F "variables[RELEASE]=$RELEASE" -F "variables[VERSIONNAME]=$VERSION_NAME" -F "variables[VERSIONNUMBER]=$BUILDVERSION" -F "token=$TRIGGERWEB" -F "ref=master" "https://lab.shelter.moe/api/v4/projects/28/trigger/pipeline"