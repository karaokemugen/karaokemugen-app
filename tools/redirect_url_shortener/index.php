<?php
/*
Quick and dirty implementation for bug #314 of Karaoke Mugen
https://lab.shelter.moe/karaokemugen/karaokemugen-app/issues/314
This is not meant to stay as is! Authentification is needed
*/

// Rename this file to something random to avoid people GETting it, or protect it with a .htaccess
$file='liste.json';


if(file_exists($file)) {
	$data=json_decode(file_get_contents($file), true);
} else {
	$data=[];
}

if (isset($_POST['localIP']) && isset($_POST['localPort']) && isset($_POST['IID'])) {
	
	$infos=[
		'date'=>date(DATE_ATOM),
		'remoteIP'=>$_SERVER['REMOTE_ADDR'],
		'localIP'=>$_POST['localIP'],
		'localPort'=>$_POST['localPort'],
		'IID'=>$_POST['IID'],
		];
		
	//Check if another record already exists
	$found=-1;
	foreach($data as $key => $record) {
		if($record['remoteIP']==$infos['remoteIP']) {
			$found=$key;
		}
	}

	//Inserting
	if($found!=-1) {
		
		if ($record['IID']==$infos['IID']) {
			$data[$key]=$infos;
			echo 'Update OK';
		} else {
			header("HTTP/1.0 403 Forbidden");
			echo 'Instance ID not recognized';
			die();
		}
		
	} else {
		
		
		$data[]=$infos;
		echo 'Update OK';
	}

	//Writing file
	//echo(json_encode($data,JSON_PRETTY_PRINT));
	file_put_contents($file,json_encode($data,JSON_PRETTY_PRINT));

} else {
	
	
	$found=-1;
	foreach($data as $key => $record) {
		if($record['remoteIP']==$_SERVER['REMOTE_ADDR']) {
			$found=$record;
		}
	}
	
	//Redirect if we found a match
	if($found!=-1) {
		$separator = ($found['localPort'] != '') ? ':' : '';
		header('Location: http://' . $found['localIP'] . $separator . $found['localPort']);   
	} else { 
		echo "There is no Karaoke Mugen instance running at your location";
	}
}
?>
