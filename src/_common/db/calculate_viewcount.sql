UPDATE karasdb.kara SET viewcount = 
(SELECT COUNT(*) FROM viewcount WHERE kid=$kid)
 WHERE kid=$kid;