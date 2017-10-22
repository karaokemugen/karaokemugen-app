#!/bin/sh

# Script permettant de tester rapidement la régénération de la base de données, durant le refactoring du code associé.

# On se place dans le répertoire racine de l'application.
cd $(dirname $0)
# On supprime la base pour forcer sa régénération.
rm -rf app/db
# On démarre l'application pour vérifier son comportement.
yarn start
