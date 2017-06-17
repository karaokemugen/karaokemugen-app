// Génération de la base de données depuis un dossier de datas

var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var ini = require("ini");
var timestamp = require("unix-timestamp");
var probe = require('./src/common/modules/node-ffprobe.js');
var math = require('mathjs');
var S = require('string');
const uuidV4 = require("uuid/v4");

// Pour l'instant on met les infos en dur.
// Plus tard dans le fichier de config
const karasdir = 'app/data/karas';
const videosdir = 'app/data/videos';
const karas_dbfile = 'app/db/karas.sqlite3';

const sqlCreateKarasDBfile = 'src/common/db/karas.sqlite3.sql';
const sqlCreateKarasDBViewAllfile = 'src/common/db/view_all.view.sql';

function addTag(tag,tagtype,id_kara,db) {
    // Fonction d'ajout d'un tag dans la base, en le liant à un kara
}

function addSerie(serie,id_kara,db) {
    // Fonction pour ajouter une série et la lier à un kara
}

function addKara(kara,db) {
    // Fonction d'ajout d'un kara dans la base
  
    // Parse du .kara
    console.log('Ajout de '+kara);
    var karadata = ini.parse(fs.readFileSync(karasdir+'/'+kara,'utf-8'));

    // Création d'un timestamp
    timestamp.round = true;
    var DateAdded = timestamp.now();
    var DateModif = DateAdded;

    // Test de présence du KID
    if (karadata.KID) {
        // KID présent
        var KID = karadata.KID;
        // On vérifie si le KID existe en base.
        sqlSelectKaraKID = 'SELECT * FROM kara WHERE kid=$KID';
        var id_kara = undefined;
        var kara_from_db = db.get(sqlSelectKaraKID, 
            {$KID: KID},
            function (err, row){
                if (err) {
                    console.log("Impossible de retrouver le KID: "+err);
                    process.exit();
                }
                if (row) {
                    //KID connu en base
                    console.log("KID trouvé avec ID : "+row.PK_id_kara);
                    id_kara = row.PK_id_kara;
                    return row;
                } else {
                    //KID non trouvé en base
                    sqlInsertKaraFirst = 'INSERT INTO kara(kid,date_added) VALUES($KID, $date_added)';
                    db.run(sqlInsertKaraFirst, {
                    $KID: KID, 
                    $DateAjout: DateAdded
                    }, function (err) {
                        if (err) {
                        console.log("Erreur d'insertion du kara initial");
                        process.exit();
                        }
                        id_kara = this.lastID;
                        console.log("ID du kara crée : "+kara_id);
                    });
                }                
            }
        );    
    } else {
        // KID pas présent, on l'ajoute
        // Génération
        var KID = uuidv4();
        karadata.KID = KID;
        fs.writeFile(karasdir+'/'+kara,ini.stringify(karadata),function (err,rep) {
            if (err) {
                console.log("Impossible d'écrire le .kara !");
                process.exit();
            }
            fs.appendFile(karasdir+'/'+kara,';DO NOT MODIFY - KID GENERATED AUTOMATICALLY',function(err, rep) {
                if (err) {
                    console.log("Impossible d'ajouter la ligne de commentaire au .kara!: "+err);
                    process.exit();
                }
            });
        });

        // On insère les premières infos du kara
        sqlInsertKaraFirst = 'INSERT INTO kara(kid,date_added) VALUES($KID, $date_added)';
        db.run(sqlInsertKaraFirst, {
            $KID: KID, 
            $DateAjout: DateAdded
        }, function (err) {
            if (err) {
                console.log("Erreur d'insertion du kara initial");
                process.exit();
            }
            id_kara = this.lastID;
            console.log("ID du kara crée : "+kara_id);
        });        
    }

    // Récupérer le nom du .kara sans le .kara
    var karaWOExtension = S(kara).chompRight('.kara');

    // Découper le nom du kara : langue, série, type, titre
    var karaInfos = karaWOExtension.split(' - ');
    var karaLang = karaInfos[0];
    var karaSerie = karaInfos[1];
    var karaType = karaInfos[2];
    var karaTitle = karaInfos[3];    

    // Vérifier si y'a OAV / OVA dans le nom de série
    if S(karaSerie).contains(' OAV') || S(karaSerie).contains(' OVA') {
        addTag('TAG_OVA',7,id_kara,db);
        karaSerie = S(karaSerie).strip(' OAV',' OVA');        
    }

    // Check si le titre contient SPOIL (le retirer)

    // Check si le titre contient LONG (le retirer, ne rien faire)

    // Ordre : trouver le songorder à la suite du type et le retirer
    
    // Chopper l'année dans le .kara
    var year = karadata.year;
    
    // Fichiers vidéo et sub
    var videofile = karadata.videofile;
    var subfile = karadata.subfile;

    // Longueur du kara
    var videolength = undefined;
    probe.FFPROBE_PATH = 'app/bin/ffprobe.exe';
    probe(videosdir+'/'+videofile,function (err, videodata) {
        if (err) {
            console.log("Impossible de probe la vidéo : "+err);
            videolength = 0;
        } else {
            videolength = math.round(videodata.format.duration);
            sqlUpdateKaraVideoLength = 'UPDATE kara SET videolength = $videolength WHERE PK_id_kara = $id_kara';
            db.run(sqlUpdateKaraVideoLength, {
                $id_kara: id_kara, 
                $videolength: videolength
            }, function (err) {
            if (err) {
                console.log("Erreur d'update de la durée de la vidéo : "+err);
                process.exit();
                }
            });  
        }
    });

    // Check si singer est présent
    // Vérifier si plusieurs séparés par , ou + ou and ou &
    
    // Check si author est présent
    // Vérifier si plusieurs séparés par des , + and ou &

    // Check si creator est présent
    // Vérifier si plusieurs séparés par des , + and ou &
    
    // Check si songwriter est présent
    // Vérifier si plusieurs séparés par des , + and ou &
    
    // Langues
    // Check la langue du nom du fichier    
    // check le additional_languages séparés par des ,
    
    // Check du type de song

    // Check valeur tag 
    // Séparés par des virgules
    // Si tag trouvable dans le fichier de localisation, alors on remplace par la variable de localisation
    // Sinon on stocke tel quel et on considère que c'est un tag personnalisé


    // Update dans la bdd des infos qu'on a :
    // Titre
    // Songorder
    // Année
    // Vidéofile
    // Subfile
    // Longueur
    // Datemodif
    // et tout ça avec id_kara


}

// Suppression de la bdd d'abord
fs.unlinkSync(karas_dbfile);

// Connexion et création de la bdd
var karas_db = new sqlite3.Database(karas_dbfile,function (err,rep){ 
    if (err) {
        console.log('Erreur ouverture base Karas');
        process.exit();
    }
    // Création des tables
    var sqlCreateKarasDB = fs.readFileSync(sqlCreateKarasDBfile,'utf-8');
    karas_db.exec(sqlCreateKarasDB, function (err, rep){
        if (err) {
            console.log('Erreur create');
            console.log(err);
            console.log(sqlCreateKarasDB);
        }
    });

    // Création de la vue all_karas
    var sqlCreateKarasDBViewAll = fs.readFileSync(sqlCreateKarasDBViewAllfile,'utf8');
    karas_db.exec(sqlCreateKarasDBViewAll, function (err, rep){
        if (err) {
            console.log('Erreur create view');
            console.log(err);
            console.log(sqlCreateKarasDBViewAll);
        }
    });

    var karas = fs.readdirSync(karasdir);

    karas.forEach(addKara(value,karas_db));

    karas_db.close();

});

