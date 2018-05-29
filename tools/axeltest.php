<?php
if(isset($_GET['showsource'])){ echo '<!DOCTYPE html><html><head><meta charset="utf-8">';highlight_string(file_get_contents(__FILE__));die(); }

// ajout: https://keul.fr/axeltest.php?localIP=192.168.0.1&localPort=1337&IID=aaa

// voir l'état: https://keul.fr/liste.json

$fichier='liste.json';


if(file_exists($fichier)) {
	$data=json_decode(file_get_contents('liste.json'), true);
} else {
	$data=[];
}


if (isset($_GET['localIP']) && isset($_GET['localPort']) && isset($_GET['IID'])) {
	
	$infos=[
		'Date'=>date(DATE_ATOM),
		'remoteIP'=>$_SERVER['REMOTE_ADDR'],
		'localIP'=>$_GET['localIP'],
		'localPort'=>$_GET['localPort'],
		'IID'=>$_GET['IID'],
		];
		
	//on regarde si un enregistrement existe déjà
	$found=-1;
	foreach($data as $key => $record) {
		if($record['remoteIP']==$infos['remoteIP']) {
			$found=$key;
		}
	}

	//on insère
	if($found!=-1) {
		
		if ($record['IID']==$infos['IID']) {
			$data[$key]=$infos;
			echo 'MAJ OK';
		} else {
			echo 'KM Instance ID non reconnue';
		}
		
	} else {
		
		
		$data[]=$infos;
		echo 'Enregistrement OK';
	}

	//on enregistre
	file_put_contents('liste.json',json_encode($data,JSON_PRETTY_PRINT));

} else {
	
	
	$found=0;
	foreach($data as $key => $record) {
		if($record['remoteIP']==$_SERVER['REMOTE_ADDR']) {
			$found=$record;
		}
	}
	
	//on redirige si on a trouvé
	if($found!=-1) {
		$separator = ($found['localPort'] != '') ? ':' : '';
		header('Location: http://' . $found['localIP'] . $separator . $found['localPort']);   
	} else { 
		echo "KM Instance ID non reconnue";
	}
	
}





/*
Quick and dirty implementation for bug #314 of Karaoke Mugen
https://lab.shelter.moe/karaokemugen/karaokemugen-app/issues/314
This is not meant to stay as is! Authentification is needed
*/

/* 
$entete = array(
                0 => "Date",
                1 => "RemoteIP",
				2 => "LocalIP",
                3 => "LocalPort",
				4 => "IID",
                );


function update_csv($fichiercsv, $newLocalIP, $newLocalPort, $newIID) {
	$csv = Array();
    $compteurligne = 0;
	$remoteIP = $_SERVER['REMOTE_ADDR'];
    if (($f = fopen($fichiercsv, "r")) !== FALSE) {
        $longueurmax_ligne = defined('MAX_LINE_LENGTH') ? MAX_LINE_LENGTH : 10000;        
		$IPFound = false;
        while (($art = fgetcsv($f, $longueurmax_ligne,',')) !== FALSE) {
            $entree = array_combine($entete, $art);
			if ($remoteIP == $entree['RemoteIP']) {
				$IPFound = true;
				$entree['Date'] = date(DATE_ATOM);
				$entree['LocalIP'] = $newLocalIP;
				$entree['LocalPort'] = $newLocalPort;
				$entree['IID'] = $newIID;
			}
			$str = implode(',',$entree);
            $csv[] = $str;
            $compteurart++;
        }
		if ($IPFound == false) {
			//Adding if it doesn't exist.'
			$art['Date'] = date(DATE_ATOM);
			$art['LocalIP'] = $newLocalIP;
			$art['LocalPort'] = $newLocalPort;
			$art['RemoteIP'] = $_SERVER['REMOTE_ADDR'];
			$art['IID'] = $newIID;
			$str = implode(',',$art);
			$csv[] = $str;
		}
        fclose($f);
		$f = fopen($fichiercsv, "w");		
		foreach($csv as $value) {
			fwrite($f,$value.PHP_EOL);
		}
		fclose($f);
		echo("KM Instance information updated");
    }
}

function parseur_csv($fichiercsv) {
    $csv = Array();
    $compteurligne = 0;
    if (($f = fopen($fichiercsv, "r")) !== FALSE) {
        $longueurmax_ligne = defined('MAX_LINE_LENGTH') ? MAX_LINE_LENGTH : 10000;
        while (($art = fgetcsv($f, $longueurmax_ligne,',')) !== FALSE) {
			echo(implode(',',$art));
            $entree = array_combine($entete, $art);
            $csv[] = $entree;            
            $compteurart++;
        }
        fclose($f);
    }
    return $csv;
}

if (isset($_POST['localIP']) && isset($_POST['localPort']) && isset($_POST['IID'])) {
	$localIP = $_POST['localIP'];
	$localPort = $_POST['localPort'];
	$remoteIP = $_SERVER['REMOTE_ADDR'];
	$IID = $_POST['IID'];
	// Check if remote IP exists in our database
	$db = parseur_csv("liste.csv");
	$IPFound = false;
	$dbLocalIP = '';
	$dbLocalPort = '';	
	foreach($db as $art) {
		if ($art['RemoteIP'] == $remoteIP) {
			$IPFound = true;
			$dbLocalIP = $art['LocalIP'];
			$dbLocalPort = $art['LocalPort'];
			$dbIID = $art['IID'];
		}		
	}
	if ($IPFound == true) {
		// If localIP or port is different, update it
		if ($dbIID == $IID) {
			if ($localIP != $dbLocalIP || $localPort != $dbLocalPort) {
				update_csv("liste.csv",$localIP,$localPort,$IID);
			}		
		} else {
			echo("KM Instance ID is not recognized.");
		}
	} else { 
		update_csv("liste.csv",$localIP,$localPort,$IID);
	}
} else {
	// Check if remote IP exists in our database
	$db = parseur_csv("liste.csv");
	$IPFound = false;
	foreach($db as $art) {
		if ($art['RemoteIP'] == $remoteIP) {
			$IPFound = true;
		}
	}
	if ($IPFound == true) {
		if ($localPort != '') $localPort = ':'.$localPort;
		header('Location: http://'.$localIP.$localPort);   
	} else { 
		echo("Sorry, your Karaoke Mugen instance is unknown.");
	}
}
*/
?>