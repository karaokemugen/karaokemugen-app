// SQL for song polls

export const insertSongPoll = `INSERT INTO songpoll(created_at,open) 
								VALUES ($datetime,1);
							`;

export const closeSongPoll = 'UPDATE songpoll SET open = 0;';

export const addPollChoices = `INSERT INTO songpoll_playlistcontent(fk_id_poll,											fk_id_plcontent)
								VALUES($poll_id,$playlistcontent_id);
								`;