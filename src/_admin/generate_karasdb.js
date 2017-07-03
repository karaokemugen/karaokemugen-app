/*
Usage

var generator = require('generate_karasdb.js');
generator.SYSPATH = './'; // set the base path of toyunda app here
generator.run().then(function(response){
    // do whatever you want on script end
});
*/

const clc = require('cli-color');

module.exports = {
    SYSPATH:null,
    SETTINGS:null,
    run:function(){
        module.exports.onLog('success','generate_karasdb :: Start');
        return new Promise(function(resolve, reject){
            if(module.exports.SYSPATH==null)
            {
                module.exports.onLog('error','SYSPATH is not defined');
                process.exit();
            }

            var path = require('path');
            var sqlite3 = require('sqlite3').verbose();
            var fs = require("fs");
            var ini = require("ini");
            var timestamp = require("unix-timestamp");
            var probe = require('../_common/modules/node-ffprobe');
            var math = require('mathjs');
            var S = require('string');
            var moment = require('moment');
            const uuidV4 = require("uuid/v4");
            const async = require('async');
            const { diacritics, normalize } = require('normalize-diacritics');
            var csv = require('csv-string');

            const karasdir = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.Karas);
            const videosdir = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.Videos);
            const karas_dbfile = path.join(
                module.exports.SYSPATH,
                module.exports.SETTINGS.Path.DB,
                module.exports.SETTINGS.Path.DBKarasFile);
            const series_altnamesfile = path.join(module.exports.SYSPATH, module.exports.SETTINGS.Path.Altname);
            probe.FFPROBE_PATH = path.join(module.exports.SYSPATH,module.exports.SETTINGS.Binaries[module.exports.SETTINGS.os].BinProbe);

            const sqlCreateKarasDBfile = path.join(__dirname,'../_common/db/karas.sqlite3.sql');
            const sqlCreateKarasDBViewAllfile = path.join(__dirname,'../_common/db/view_all.view.sql');

            // Suppression de la bdd d'abord
            if (fs.existsSync(karas_dbfile)) {
                fs.unlinkSync(karas_dbfile);
            };

            var sqlInsertKaras = 'BEGIN TRANSACTION;';
            var sqlInsertSeries = 'BEGIN TRANSACTION;';
            var sqlInsertTags = 'BEGIN TRANSACTION;';
            var sqlInsertKarasTags = 'BEGIN TRANSACTION;';
            var sqlInsertKarasSeries = 'BEGIN TRANSACTION;';
            var sqlUpdateVideoLength = 'BEGIN TRANSACTION;';
            var sqlUpdateSeriesAltNames = 'BEGIN TRANSACTION;';
            var karas = [];
            var series = [];
            var tags = [];
            var karas_series = [];
            var karas_tags = [];
            var id_kara = 0;
            var karafiles = fs.readdirSync(karasdir);
            var date = new Date();
            moment.locale('fr');

            module.exports.onLog('success',moment().format('LTS')+' - Lecture dossier OK');
            //D'abord analyser les .kara, ajouter l'UUID s'il n'y est pas, construire la table karas avec une seule transaction.
            karafiles.forEach(function(kara){
                addKara(kara);
            });
            module.exports.onLog('success',moment().format('LTS')+' - Tableau karas OK ('+karas.length+' karas)');
            //Un autre passage dans karas pour avoir la durée des vidéos, mais cette fois en série
            id_kara = 0;
            karas.forEach(function(kara)
            {
                id_kara++;
                getvideoduration(kara['videofile'],id_kara,function(err,videolength,id){
                    sqlUpdateVideoLength += 'UPDATE kara SET videolength='+videolength+' WHERE PK_id_kara='+id+';';
                });

            });
            module.exports.onLog('success',moment().format('LTS')+' - Calcul durée des vidéos OK');
            karafiles.forEach(function(kara){
                id_kara++;
                addTags(kara,id_kara);
            });
            module.exports.onLog('success',moment().format('LTS')+' - Tableau tags OK ('+tags.length+' tags, '+karas_tags.length+' liaisons)');
            id_kara = 0;
            karafiles.forEach(function(kara){
                id_kara++;
                addSeries(kara,id_kara);
            });
            module.exports.onLog('success',moment().format('LTS')+' - Tableau series OK ('+series.length+' séries, '+karas_series.length+' liaisons)');

                        //Construction des requêtes SQL
                        async.eachOf(karas, function(kara, id_kara, callback){
                            id_kara++;
                            var titlenorm = normalize(kara['title']);
                            sqlInsertKaras += "\n"+'INSERT INTO kara(PK_id_kara,kid,title,NORM_title,year,songorder,videofile,subfile,date_added,date_last_modified,rating,viewcount) VALUES('+id_kara+',"'+kara['KID']+'","'+escape(kara['title'])+'","'+escape(titlenorm)+'","'+kara['year']+'",'+kara['songorder']+',"'+escape(kara['videofile'])+'","'+escape(kara['subfile'])+'",'+kara['dateadded']+','+kara['datemodif']+','+kara['rating']+','+kara['viewcount']+');';
                            callback();
                        })
                        sqlInsertKaras += 'COMMIT;'

                        async.eachOf(series, function(serie, id_series, callback){
                            id_series++;
                            var serienorm = normalize(serie);
                            sqlInsertSeries += 'INSERT INTO series(PK_id_series,name,NORM_name) VALUES('+id_series+',"'+serie+'","'+serienorm+'");';
                            callback();
                        })
                        sqlInsertSeries += 'COMMIT;'
                        async.eachOf(tags, function(tag, id_tag, callback){
                            id_tag++;
                            tag = tag.split(',');
                            var tagname = tag[0];
                            var tagnamenorm = normalize(tagname);
                            var tagtype = tag[1];
                            sqlInsertTags += 'INSERT INTO tag(PK_id_tag,tagtype,name,NORM_name) VALUES('+id_tag+','+tagtype+',"'+tagname+'","'+tagnamenorm+'");';
                            callback();
                        })
                        sqlInsertTags += 'COMMIT;'
                        async.each(karas_tags, function(karatag, callback){
                            karatag = karatag.split(',');
                            var id_tag = karatag[0];
                            var id_kara = karatag[1];
                            sqlInsertKarasTags += 'INSERT INTO kara_tag(FK_id_tag,FK_id_kara) VALUES('+id_tag+','+id_kara+');';
                            callback();
                        })
                        sqlInsertKarasTags += 'COMMIT;'
                        async.each(karas_series, function(karaseries, callback){
                            karaseries = karaseries.split(',');
                            var id_series = karaseries[0];
                            var id_kara = karaseries[1];
                            sqlInsertKarasSeries += 'INSERT INTO kara_series(FK_id_series,FK_id_kara) VALUES('+id_series+','+id_kara+');';
                            callback();
                        })
                        sqlInsertKarasSeries += 'COMMIT;'


                        //Traitement des altnames de séries

                        if (fs.existsSync(series_altnamesfile))
                        {
                            var DoUpdateSeriesAltNames = true;
                            series_altnamesfilecontent = fs.readFileSync(series_altnamesfile);
                            csv.forEach(series_altnamesfilecontent.toString(),':',function (serie,index) {
                                var serie_name = serie[0];
                                var serie_altnames = serie[1];
                                if (!S(serie_altnames).isEmpty() || !S(serie_name).isEmpty()) {
                                    var serie_altnamesnorm = normalize(serie[1]);
                                    sqlUpdateSeriesAltNames += 'UPDATE series SET altname="'+serie_altnames+'",NORM_altname="'+serie_altnamesnorm+'" WHERE name="'+serie_name+'";';
                                }
                                //module.exports.onLog('error','['+index+'] '+serie_name+' -> '+serie_altnames);
                            })
                            sqlUpdateSeriesAltNames += 'COMMIT;'
                        } else {
                            var DoUpdateSeriesAltNames = false;
                            module.exports.onLog('warning','Pas de fichier de noms de séries alternatifs. On passe');

                        }



                        generateDB();






            function getvideoduration(videofile,id_kara,callback) {
                var videolength = 0;
                if (fs.existsSync(videosdir+'/'+videofile))
                {
                    probe(videosdir+'/'+videofile,function (err, videodata) {
                        if (err) {
                            module.exports.onLog('error',"["+videofile+"] Impossible de probe la vidéo : "+err);
                            callback(err,videolength,id_kara);
                        } else {
                            videolength = math.round(videodata.format.duration);
                            callback(null,videolength,id_kara);
                        }
                    });
                } else {
                    module.exports.onLog('notice','Fichier vidéo '+videofile+' inexistant, pas de calcul.')
                }


            }

            function generateDB() {
                var db = new sqlite3.Database(karas_dbfile,function (err,rep){
                    if (err) {
                        module.exports.onLog('error','Erreur ouverture base Karas');
                        process.exit();
                    }
                    module.exports.onLog('success',moment().format('LTS')+' - Creation BDD OK');
                    // Création des tables
                    var sqlCreateKarasDB = fs.readFileSync(sqlCreateKarasDBfile,'utf-8');
                    db.exec(sqlCreateKarasDB, function (err, rep){
                        if (err) {
                            module.exports.onLog('error','Erreur create');
                            module.exports.onLog('error',err);
                        } else {
                        module.exports.onLog('success',moment().format('LTS')+' - Creation tables OK');
                        var sqlCreateKarasDBViewAll = fs.readFileSync(sqlCreateKarasDBViewAllfile,'utf8');
                        db.exec(sqlCreateKarasDBViewAll, function (err, rep){
                            if (err) {
                                module.exports.onLog('error','Erreur create view');
                                module.exports.onLog('error',err);
                                module.exports.onLog('error',sqlCreateKarasDBViewAll);
                            } else {
                                module.exports.onLog('success',moment().format('LTS')+' - Creation view OK');
                                db.exec(sqlInsertKaras, function (err,rep) {
                                    if (err) {
                                        module.exports.onLog('error','Erreur remplissage kara');
                                        module.exports.onLog('error',err);
                                    } else {
                                        module.exports.onLog('success',moment().format('LTS')+' - Remplissage karas OK');
                                        sqlUpdateVideoLength += 'COMMIT;';
                                        db.exec(sqlUpdateVideoLength, function (err,rep) {
                                            if (err) {
                                                module.exports.onLog('error','Erreur MAJ de la durée des vidéos');
                                                module.exports.onLog('error',err);
                                            } else {
                                                module.exports.onLog('success',moment().format('LTS')+' - MAJ durée des vidéos OK');
                                            }
                                        })

                                        db.exec(sqlInsertTags, function (err,rep) {
                                            if (err) {
                                                module.exports.onLog('error','Erreur remplissage tags');
                                                module.exports.onLog('error',err);
                                            } else {
                                                module.exports.onLog('success',moment().format('LTS')+' - Remplissage tags OK');
                                                db.exec(sqlInsertKarasTags, function (err,rep) {
                                                    if (err) {
                                                        module.exports.onLog('error','Erreur remplissage karas_tags');
                                                        module.exports.onLog('error',err);
                                                    } else {
                                                        module.exports.onLog('success',moment().format('LTS')+' - Remplissage karas_tags OK');
                                                        db.exec(sqlInsertSeries, function (err,rep) {
                                                            if (err) {
                                                                module.exports.onLog('error','Erreur remplissage séries');
                                                                module.exports.onLog('error',err);
                                                            } else {
                                                                module.exports.onLog('success',moment().format('LTS')+' - Remplissage séries OK');
                                                                if (DoUpdateSeriesAltNames)
                                                                {
                                                                    db.exec(sqlUpdateSeriesAltNames, function (err, rep) {
                                                                        if (err) {
                                                                            module.exports.onLog('error','Erreur MAJ series altnames');
                                                                            module.exports.onLog('error',err);
                                                                        } else {
                                                                            module.exports.onLog('success',moment().format('LTS')+' - MAJ noms alternatifs des séries OK');
                                                                        }
                                                                    })
                                                                }

                                                                db.exec(sqlInsertKarasSeries, function (err,rep) {
                                                                    if (err) {
                                                                        module.exports.onLog('error','Erreur remplissage     karas_series');
                                                                        module.exports.onLog('error',err);
                                                                    } else {
                                                                        module.exports.onLog('success',moment().format('LTS')+' - Remplissage karas_series OK');
                                                                    }
                                                                    resolve();
                                                                });
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        });

                    }
                    });
                });
            }

            function addSeries(karafile,id_kara) {
                var karadata = ini.parse(fs.readFileSync(karasdir+'/'+karafile,'utf-8'));
                var karaWOExtension = S(karafile).chompRight('.kara');
                var karaInfos = karaWOExtension.split(' - ');
                var karaType = karaInfos[2];
                var serieslist = [];


                if (S(karadata.series).isEmpty()) {
                    if (karaType == 'LIVE' || karaType == 'MV'){
                        // Ne rien faire en fait
                    } else {
                        serieslist.push(karaInfos[1]);
                    }
                } else {
                    serieslist = karadata.series.split(',');
                }

                async.each(serieslist, function(serie, callback){
                    serie = S(serie).trimLeft().s;
                    if (series.indexOf(serie) == -1 ){
                        series.push(serie);
                    }
                    // On récupère le nouvel index
                    var seriesIDX = series.indexOf(serie);
                    seriesIDX++;
                    karas_series.push(seriesIDX+','+id_kara);
                    callback();
                });
            }

            function addTags(karafile,id_kara) {
                var karadata = ini.parse(fs.readFileSync(karasdir+'/'+karafile,'utf-8'));
                var karaWOExtension = S(karafile).chompRight('.kara');
                var karaInfos = karaWOExtension.split(' - ');
                var karaSerie = karaInfos[1];
                var karaTitle = karaInfos[3];
                var karaType = karaInfos[2];
                var taglist = [];

                //On remplit la taglist, c'est parti.
                if (S(karaSerie).contains(' OAV') || S(karaSerie).contains(' OVA') || S(karaType).contains('OAV')) {
                    if (taglist.indexOf('TAG_OVA,7') == -1 ){
                        taglist.push('TAG_OVA,2');
                    }
                }
                if (karaType == 'LIVE' || karaType == 'MV'){
                        //Ajouter les artistes à la place de la série
                        var singers = karaSerie.split(',');

                        singers.forEach(function(singer){
                                var tag = S(singer).trimLeft().s;
                                if (taglist.indexOf(tag+',2') == -1 ){
                                    taglist.push(tag+',2');
                                }
                        });
                }

                if (!S(karadata.singer).isEmpty()) {
                    var singers = karadata.singer.split(',');
                    singers.forEach(function(singer){
                        var tag = S(singer).trimLeft().s;
                        if (taglist.indexOf(tag+',2') == -1 ){
                            taglist.push(tag+',2');
                        }
                    });
                }

                if (!S(karadata.author).isEmpty()) {
                    var authors = karadata.author.split(',');
                    authors.forEach(function(author){
                        var tag = S(author).trimLeft().s;
                        if (taglist.indexOf(tag+',6') == -1 ){
                            taglist.push(tag+',6');
                        }
                    });
                }

                if (!S(karadata.creator).isEmpty()) {
                    var creators = karadata.creator.split(',');
                    creators.forEach(function(creator){
                        var tag = S(creator).trimLeft().s;
                        if (taglist.indexOf(tag+',4') == -1 ){
                            taglist.push(tag+',4');
                        }
                    });
                }

                if (!S(karadata.songwriter).isEmpty()) {
                    var songwriters = karadata.songwriter.split(',');
                    songwriters.forEach(function(songwriter){
                        var tag = S(songwriter).trimLeft().s;
                        if (taglist.indexOf(tag+',8') == -1 ){
                            taglist.push(tag+',8');
                        }
                    });
                }

                if (!S(karadata.lang).isEmpty()) {
                    var langs = karadata.lang.split(',');
                    langs.forEach(function(lang){
                        var tag = S(lang).trimLeft().s;
                        if (taglist.indexOf(tag+',5') == -1 ){
                            taglist.push(tag+',5');
                        }
                    });
                }

                // Check du type de song
                    if (S(karaType).contains('AMV')) {
                        if (taglist.indexOf('TYPE_AMV,3') == -1 ){
                            taglist.push('TYPE_AMV,3');
                        }
                    }
                    if (S(karaType).contains('CM')) {
                        if (taglist.indexOf('TYPE_CM,3') == -1 ){
                            taglist.push('TYPE_CM,3');
                        }
                    }
                    if (S(karaType).contains('ED')) {
                        if (taglist.indexOf('TYPE_ED,3') == -1 ){
                            taglist.push('TYPE_ED,3');
                        }
                    }
                    if (S(karaType).contains('GAME')) {
                        if (taglist.indexOf('TAG_VIDEOGAME,7') == -1 ){
                            taglist.push('TAG_VIDEOGAME,7');
                        }
                    }
                    if (S(karaType).contains('GC')) {
                        if (taglist.indexOf('TAG_GAMECUBE,7') == -1 ){
                            taglist.push('TAG_GAMECUBE,7');
                        }
                    }
                    if (S(karaType).contains('IN')) {
                        if (taglist.indexOf('TYPE_INSERTSONG,3') == -1 ){
                            taglist.push('TYPE_INSERTSONG,3');
                        }
                    }
                    if (S(karaType).contains('LIVE')) {
                        if (taglist.indexOf('TYPE_LIVE,3') == -1 ){
                            taglist.push('TYPE_LIVE,3');
                        }
                    }
                    if (S(karaType).contains('MOVIE')) {
                        if (taglist.indexOf('TAG_MOVIE,7') == -1 ){
                            taglist.push('TAG_MOVIE,7');
                        }
                    }
                    if (S(karaType).contains('OAV')) {
                        if (taglist.indexOf('TAG_OVA,7') == -1 ){
                            taglist.push('TAG_OVA,7');
                        }
                    }
                    if (S(karaType).contains('OP')) {
                        if (taglist.indexOf('TYPE_OP,3') == -1 ){
                            taglist.push('TYPE_OP,3');
                        }
                    }
                    if (S(karaType).contains('MV')) {
                        if (taglist.indexOf('TYPE_MUSIC,3') == -1 ){
                            taglist.push('TYPE_MUSIC,3');
                        }
                    }
                    if (S(karaType).contains('OT')) {
                        if (taglist.indexOf('TYPE_OTHER,3') == -1 ){
                            taglist.push('TYPE_OTHER,3');
                        }
                    }
                    if (S(karaType).contains('PS3')) {
                        if (taglist.indexOf('TAG_PS3,7') == -1 ){
                            taglist.push('TAG_PS3,7');
                        }
                    }
                    if (S(karaType).contains('PS2')) {
                        if (taglist.indexOf('TAG_PS2,7') == -1 ){
                            taglist.push('TAG_PS2,7');
                        }
                    }
                    if (S(karaType).contains('PSV')) {
                        if (taglist.indexOf('TAG_PSV,7') == -1 ){
                            taglist.push('TAG_PSV,7');
                        }
                    }
                    if (S(karaType).contains('PSX')) {
                        if (taglist.indexOf('TAG_PSX,7') == -1 ){
                            taglist.push('TAG_PSX,7');
                        }
                    }
                    if (S(karaType).contains('PV')) {
                        if (taglist.indexOf('TYPE_PV,3') == -1 ){
                            taglist.push('TYPE_PV,3');
                        }
                    }
                    if (S(karaType).contains('R18')) {
                        if (taglist.indexOf('TAG_R18,7') == -1 ){
                            taglist.push('TAG_R18,7');
                        }
                    }
                    if (S(karaType).contains('REMIX')) {
                        if (taglist.indexOf('TAG_REMIX,7') == -1 ){
                            taglist.push('TAG_REMIX,7');
                        }
                    }
                    if (S(karaType).contains('SPECIAL')) {
                        if (taglist.indexOf('TAG_SPECIAL,7') == -1 ){
                            taglist.push('TAG_SPECIAL,7');
                        }
                    }
                    if (S(karaType).contains('VOCA')) {
                        if (taglist.indexOf('TAG_VOCALOID,7') == -1 ){
                            taglist.push('TAG_VOCALOID,7');
                        }
                    }
                    if (S(karaType).contains('XBOX360')) {
                        if (taglist.indexOf('TAG_XBOX360,7') == -1 ){
                            taglist.push('TAG_XBOX360,7');
                        }
                    }

                async.each(taglist, function(tag, callback){
                    tag = S(tag).trimLeft().s;
                    if (tags.indexOf(tag) == -1 ){
                        tags.push(tag);
                    }
                    // On récupère le nouvel index
                    var tagsIDX = tags.indexOf(tag);
                    tagsIDX++;
                    karas_tags.push(tagsIDX+','+id_kara);
                    callback();
                });
            }

            function addKara(karafile) {
                var karadata = ini.parse(fs.readFileSync(karasdir+'/'+karafile,'utf-8'));
                var kara = [];
                if (karadata.KID) {
                    kara['KID'] = karadata.KID;
                } else {
                    var KID = uuidV4();
                    karadata.KID = KID;
                    kara['KID'] = karadata.KID;
                    fs.writeFile(karasdir+'/'+karafile,ini.stringify(karadata),function (err,rep) {
                        if (err) {
                            module.exports.onLog('error',"Impossible d'écrire le .kara !");
                            process.exit();
                        }
                        fs.appendFile(karasdir+'/'+karafile,';DO NOT MODIFY - KARAOKE ID GENERATED AUTOMATICALLY',function(err) {
                            if (err) {
                                module.exports.onLog('error',"Impossible d'ajouter la ligne de commentaire au .kara!: "+err);
                                process.exit();
                            }
                        });
                    });
                }
                timestamp.round = true;
                kara['dateadded'] = timestamp.now();
                kara['datemodif'] = kara['dateadded'];
                // Récupérer le nom du .kara sans le .kara
                var karaWOExtension = S(karafile).chompRight('.kara');
                // Découper le nom du kara : langue, série, type, titre
                var karaInfos = karaWOExtension.split(' - ');
                if (karaInfos[3] == undefined) {
                    karaInfos[3] = '';
                }
                kara['title'] = karaInfos[3];

                kara['year'] = karadata.year;
                // Ordre : trouver le songorder à la suite du type
                var karaOrder = undefined;
                var karaType = karaInfos[2];
                if (S(S(karaType).right(2)).isNumeric()) {
                        karaOrder = S(karaType).right(2).s;
                        if (S(karaOrder).left(1) == "0") {
                            karaOrder = S(karaOrder).right(1).s;
                        }
                    } else {
                        if (S(S(karaType).right(1)).isNumeric()) {
                            karaOrder = S(karaType).right(1).s;
                        } else {
                            karaOrder = 1;
                        }
                    }
                kara['songorder'] = karaOrder;
                kara['videofile'] = karadata.videofile;
                kara['subfile'] = karadata.subfile;
                kara['videolength'] = undefined;
                kara['rating'] = 0;
                kara['viewcount'] = 0;
                karas.push(kara);
            }
        })
    }    ,
    onLog:function(type,message)
    {
        // événement émis pour remonter un message de log sur l'admin
        logger.log('warning','onLog not set');
    }
}