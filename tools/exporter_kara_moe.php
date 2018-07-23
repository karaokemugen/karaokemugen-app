<?php

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// echo dirname(__FILE__).'/karas.sqlite3';
// die();

try{
    $pdo = new PDO('sqlite:'.dirname(__FILE__).'/karas.sqlite3');
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION); // ERRMODE_WARNING | ERRMODE_EXCEPTION | ERRMODE_SILENT
} catch(Exception $e) {
    echo "Impossible d'accéder à la base de données SQLite : ".$e->getMessage();
    die();
}

//,(select  json_group_array(json_object('lang',sl.lang, 'name', sl.name))
//    from serie_lang sl, kara_serie ks
//    where ks.fk_id_serie = sl.fk_id_serie
//    and k.pk_id_kara = ks.fk_id_kara
//    ) as serie_i18n
$query= '
SELECT k.pk_id_kara AS kara_id, k.kid, k.title, k.NORM_title, k.duration, k.gain, k.year, k.mediafile, k.subfile, k.created_at, k.modified_at, k.songorder

,(select GROUP_CONCAT( sl.NORM_name, \' \')
    from serie_lang sl, kara_serie ks
    where ks.fk_id_serie = sl.fk_id_serie
    and k.pk_id_kara = ks.fk_id_kara 
    ) as NORM_serie
,(select GROUP_CONCAT( s.name)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as serie
,(select GROUP_CONCAT( s.altname)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as serie_altname
,(select GROUP_CONCAT( s.NORM_altname)
    FROM kara_serie ks
    INNER JOIN serie s ON ks.fk_id_serie = s.pk_id_serie
    WHERE k.pk_id_kara = ks.fk_id_kara
    ) as NORM_serie_altname
,(select GROUP_CONCAT( t2.name)
    FROM kara_tag kt2  
    INNER JOIN tag t2 ON kt2.fk_id_tag = t2.pk_id_tag AND t2.tagtype = 2
    WHERE k.pk_id_kara = kt2.fk_id_kara
    ) as singer
,(select GROUP_CONCAT( t2.NORM_name)
    FROM kara_tag kt2  
    INNER JOIN tag t2 ON kt2.fk_id_tag = t2.pk_id_tag AND t2.tagtype = 2
    WHERE k.pk_id_kara = kt2.fk_id_kara
    ) as NORM_singer
,(select GROUP_CONCAT( t3.name)
    FROM kara_tag kt3  
    INNER JOIN tag t3 ON kt3.fk_id_tag = t3.pk_id_tag AND t3.tagtype = 3
    WHERE k.pk_id_kara = kt3.fk_id_kara
    ) as songtype
,(select GROUP_CONCAT( t4.name)
    FROM kara_tag kt4  
    INNER JOIN tag t4 ON kt4.fk_id_tag = t4.pk_id_tag AND t4.tagtype = 4
    WHERE k.pk_id_kara = kt4.fk_id_kara
    ) as creator
,(select GROUP_CONCAT( t4.NORM_name)
    FROM kara_tag kt4  
    INNER JOIN tag t4 ON kt4.fk_id_tag = t4.pk_id_tag AND t4.tagtype = 4
    WHERE k.pk_id_kara = kt4.fk_id_kara
    ) as NORM_creator
,(select GROUP_CONCAT( t5.name)
    FROM kara_tag kt5  
    INNER JOIN tag t5 ON kt5.fk_id_tag = t5.pk_id_tag AND t5.tagtype = 5
    WHERE k.pk_id_kara = kt5.fk_id_kara
    ) as [language]
,(select GROUP_CONCAT( t6.name)
    FROM kara_tag kt6  
    INNER JOIN tag t6 ON kt6.fk_id_tag = t6.pk_id_tag AND t6.tagtype = 6
    WHERE k.pk_id_kara = kt6.fk_id_kara
    ) as author
,(select GROUP_CONCAT( t6.NORM_name)
    FROM kara_tag kt6  
    INNER JOIN tag t6 ON kt6.fk_id_tag = t6.pk_id_tag AND t6.tagtype = 6
    WHERE k.pk_id_kara = kt6.fk_id_kara
    ) as NORM_author
,(select GROUP_CONCAT( t7.name)
    FROM kara_tag kt7  
    INNER JOIN tag t7 ON kt7.fk_id_tag = t7.pk_id_tag AND t7.tagtype = 7
    WHERE k.pk_id_kara = kt7.fk_id_kara
    ) as misc
,(select GROUP_CONCAT( t7.NORM_name)
    FROM kara_tag kt7  
    INNER JOIN tag t7 ON kt7.fk_id_tag = t7.pk_id_tag AND t7.tagtype = 7
    WHERE k.pk_id_kara = kt7.fk_id_kara
    ) as NORM_misc
,(select GROUP_CONCAT( t8.name)
    FROM kara_tag kt8  
    INNER JOIN tag t8 ON kt8.fk_id_tag = t8.pk_id_tag AND t8.tagtype = 8
    WHERE k.pk_id_kara = kt8.fk_id_kara
    ) as songwriter
,(select GROUP_CONCAT( t8.NORM_name)
    FROM kara_tag kt8  
    INNER JOIN tag t8 ON kt8.fk_id_tag = t8.pk_id_tag AND t8.tagtype = 8
    WHERE k.pk_id_kara = kt8.fk_id_kara
    ) as NORM_songwriter
FROM kara k
order by language, serie, singer, songtype DESC, songorder';



$data=$pdo->query($query)->fetchAll();






$types= [
    'TYPE_OP' => 'Opening',
    'TYPE_MUSIC' =>  'Music',
    'TYPE_ED' => 'Ending',
    'TYPE_OTHER' => 'Other',
    'TYPE_AMV' => 'AMV',
    'TYPE_CM' => 'CM',
    'TYPE_INSERTSONG' => 'Insert',
    'TYPE_LIVE' => 'Live',
    'TYPE_PV' => 'Preview',
];

$extensions=[
	'mp4',
	'webm',
];


function get_extension($fname){
	return substr($fname, strrpos($fname, ".") + 1);
}
function get_filename_sans_ext($fname){
	return substr($fname, 0, strrpos($fname, "."));
}


//première passe
$first_pass=[];
foreach ($data as $kara) {
	
	//on zappe les fichiers qui sont pas en mp4/webm...
	foreach($extensions as $extension) {
		if(get_extension($kara['mediafile'])!= $extension) {
			continue;
		}
	}
	
	//nom de la série ou de l'artiste
	$serie_singer = !empty($kara['serie'])?$kara['serie']:$kara['singer'];
	
	//initialisation si serie_singer pas encore ajoutée
	if(!isset($first_pass[$serie_singer])) {
		$first_pass[$serie_singer]=[];
	}
	
	$first_pass[$serie_singer][]=$kara;
}



//seconde passe
$second_pass=[];
foreach ($first_pass as $serie_singer => $kara_serie_singer) {

	//initialisation si série pas encore ajoutée
	if(!isset($second_pass[$serie_singer])) {
		$second_pass[$serie_singer]=[];
	}
	
	foreach ($kara_serie_singer as $kara) {
		$type=$types[$kara['songtype']];
		
		//initialisation si type pas encore ajoutée
		if(!isset($second_pass[$serie_singer][$type])) {
			$second_pass[$serie_singer][$type]=[];
		}
		$second_pass[$serie_singer][$type][]=$kara;
	}
}



//dernière passe, avec gestion des mots de passe
$last_pass=[];
foreach ($second_pass as $serie_singer => $kara_serie_singer) {
	
	//initialisation si série pas encore ajoutée
	if(!isset($last_pass[$serie_singer])) {
		$last_pass[$serie_singer]=[];
	}

	foreach ($kara_serie_singer as $type => $list_kara) {
		
		
		foreach($list_kara as $key => $kara) {
			
			$type_avec_num=$type.' '.($key+1);
			
			
			$kara_data=[
				'file' => get_filename_sans_ext($kara['mediafile']),
				'mime' => ['video/mp4','video/webm;codecs="vp9,opus"'],
				'song' => [
					'title' => $kara['title'],
				]
			];
			
			if(!empty($kara['author'])) {
				$kara_data['subtitles']=$kara['author'];
			}
			if(!empty($kara['singer'])) {
				$kara_data['song']['artist']=$kara['singer'];
			}
			
			$last_pass[$serie_singer][$type_avec_num]=$kara_data;
		
			
		}
	}
}

$out=var_export($last_pass,true);


//remplacement des array par []
$out=str_replace('array (','[',$out);
$out=str_replace('),','],',$out);

//remplacement des espaces par une tabulation
$out=str_replace('  ','	',$out);


echo '<pre>'.$out.'</pre>';

// echo '<pre>'.print_r($data,true).'</pre>';
// echo '<pre>'.print_r($first_pass,true).'</pre>';
// echo '<pre>'.print_r($second_pass,true).'</pre>';
// echo '<pre>'.print_r($last_pass,true).'</pre>';


