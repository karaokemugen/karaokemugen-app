git config user.name "Release Bot"
git config user.email "server@karaokes.moe"
git checkout $CI_COMMIT_BRANCH
bash util/replaceVersion.sh
git add package.json src/version.ts
VERSION=`cat package.json | grep version\": | awk -F\" {'print $4'}`;
git commit -m "chore: new release $VERSION"
git remote set-url origin "https://kmreleasebot:$DEPLOY_TOKEN@lab.shelter.moe/karaokemugen/karaokemugen-app.git"
git push