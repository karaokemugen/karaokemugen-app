// SQL for favorites management

export const insertUpvote = `INSERT INTO upvote(fk_id_plcontent, fk_id_user)
									VALUES($plc_id, $user_id);
									`;

export const deleteUpvote = `DELETE FROM upvote 
						WHERE fk_id_plcontent = $plc_id 
						  AND fk_id_user = $user_id
						  `;

export const selectUpvoteByUser = `SELECT fk_id_plcontent AS plc_id 
									FROM upvote 
								   WHERE fk_id_user = $user_id;
									`;

export const selectUpvoteByPLC = `SELECT fk_id_user AS user_id
									FROM upvote
									WHERE fk_id_plcontent = $plc_id;
								`;

