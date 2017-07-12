#!/bin/bash

################################################################################
#
# Ce script utilise ffmpeg peur calculer le gain à appliquer à chaque vidéo
# lors de la lecture.
#
################################################################################

################################################################################
# Variables utiles
################################################################################


karadir="karas"
videodir="videos"

# Quelques stats...
vidsNotFound=0
vidsAlreadyProcessed=0
totalVids=0


################################################################################
# Fonctions de logging
################################################################################


log_error ()
{
    >&2 echo $@
}


################################################################################
# Fonctions de vérification des dépendances
################################################################################


check_ffmpeg ()
{
    if ! which ffmpeg &> /dev/null
    then
        log_error "ffmpeg ne semble pas installé sur votre machine.
        Veuillez l'installer avant de continuer."
        exit 1
    fi
}

check_videodir ()
{
    if [ ! -d $videodir ]
    then
        log_error "Le dossior de vidéos semble absent de votre machine.
        Veuillez utuliser le script UpdateVideos.sh pour les télécharger."
    fi
}


################################################################################
# Obtention du gain pour le fichier courant
################################################################################


# Argument : path de la vidéo à analyser
get_gain ()
{
    gain=`ffmpeg -i $@ -af "replaygain" -f null - 2>&1 \
        | grep track_gain \
        | sed "s/.* track_gain = \([+-][0-9]*\.[0-9]*\) dB/\1/"`
}


################################################################################
# Fin des déclarations
################################################################################


check_ffmpeg
check_videodir

oldIFS=$IFS
IFS=`echo -en "\n\b"`

for karafile in $karadir/*.kara
do
    trackgain=""
    source $karafile # Permet d'obtenir videofile et trackgain, si déjà calculé
    if [ ! -f $videodir/$videofile ]
    then
        log_error "$karafile : $videofile non trouvée."
        echo "$karafile,$videofile" >> videos_not_found.csv
        let vidsNotFound++
    elif [ -n "$trackgain" ]
    then
        log_error "$karafile déjà traitée."
        let vidsAlreadyProcessed++
    else
        unset gain
        get_gain "$videodir/$videofile"
        echo "$karafile : gain=$gain"
        echo "trackgain=$gain" >> $karafile
    fi
    let totalVids++
done

IFS=$oldIFS

echo "$totalVids éléments au total."
if [ $vidsAlreadyProcessed -gt 0 ]
then
    echo "$vidsAlreadyProcessed vidéo(s) étaient déjà traitée(s)."
fi
if [ $vidsNotFound -gt 0 ]
then
    echo "$vidsNotFound vidéo(s) non trouvée(s).
    (Liste dans videos_not_found.csv"
fi
