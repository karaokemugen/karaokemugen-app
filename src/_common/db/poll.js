// SQL for song polls

export const insertSongPoll = `INSERT INTO songpoll(created_at,open) 
								VALUES ($datetime,1);
							`;

export const closeSongPoll = 'UPDATE songpoll SET open = 0;';

export const addPollChoices = `INSERT INTO songpoll_playlistcontent(fk_id_poll,											fk_id_plcontent)
								VALUES($poll_id,$playlistcontent_id);
								`;

export const getPoll = `SELECT DISTINCT sp.fk_id_plcontent AS playlistcontent_id,
								GROUP_CONCAT(u.login) AS username,
								ak.title AS title, 
								ak.songorder AS songorder, 
								ak.serie AS serie, 
								ak.singer AS singer, 
								ak.songtype AS songtype, 
								ak.language AS language, 
      							(SELECT COUNT(1) FROM songpoll_user WHERE fk_id_poll = 1 AND fk_id_plcontent = sp.fk_id_plcontent) AS votes	
							FROM karasdb.all_karas AS ak, songpoll_playlistcontent AS sp
							INNER JOIN songpoll_user AS su ON su.fk_id_plcontent = sp.fk_id_plcontent
							INNER JOIN playlist_content AS pc ON pc.fk_id_kara = ak.kara_id
							INNER JOIN user AS u on u.pk_id_user = su.fk_id_user	
							INNER JOIN songpoll AS s on s.pk_id_poll = sp.fk_id_poll
							WHERE s.open = 1
							  AND sp.fk_id_plcontent = pc.pk_id_plcontent
							GROUP BY u.login
							ORDER BY votes DESC;
						`;