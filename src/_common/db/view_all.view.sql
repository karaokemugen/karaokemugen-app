CREATE VIEW IF NOT EXISTS all_karas AS SELECT k.PK_id_kara, k.kid, k.title, k.NORM_title, k.videolength, k.gain, k.year, k.videofile, k.subfile, k.date_added, k.date_last_modified, k.rating, k.viewcount
,k.songorder
,(select GROUP_CONCAT( s.name)
    FROM kara_series ks 
    INNER JOIN series s ON ks.FK_id_series = s.PK_id_series
    WHERE k.PK_id_kara = ks.FK_id_kara
    ) as series
,(select GROUP_CONCAT( s.NORM_name)
    FROM kara_series ks 
    INNER JOIN series s ON ks.FK_id_series = s.PK_id_series
    WHERE k.PK_id_kara = ks.FK_id_kara
    ) as NORM_series
,(select GROUP_CONCAT( s.altname)
    FROM kara_series ks 
    INNER JOIN series s ON ks.FK_id_series = s.PK_id_series
    WHERE k.PK_id_kara = ks.FK_id_kara
    ) as series_altname
,(select GROUP_CONCAT( s.NORM_altname)
    FROM kara_series ks 
    INNER JOIN series s ON ks.FK_id_series = s.PK_id_series
    WHERE k.PK_id_kara = ks.FK_id_kara
    ) as NORM_series_altname
,(select GROUP_CONCAT( t2.name)
    FROM kara_tag kt2  
    INNER JOIN tag t2 ON kt2.FK_id_tag = t2.PK_id_tag AND t2.tagtype = 2
    WHERE k.PK_id_kara = kt2.FK_id_kara
    ) as singer
,(select GROUP_CONCAT( t2.NORM_name)
    FROM kara_tag kt2  
    INNER JOIN tag t2 ON kt2.FK_id_tag = t2.PK_id_tag AND t2.tagtype = 2
    WHERE k.PK_id_kara = kt2.FK_id_kara
    ) as NORM_singer
,(select GROUP_CONCAT( t3.name)
    FROM kara_tag kt3  
    INNER JOIN tag t3 ON kt3.FK_id_tag = t3.PK_id_tag AND t3.tagtype = 3
    WHERE k.PK_id_kara = kt3.FK_id_kara
    ) as songtype
,(select GROUP_CONCAT( t4.name)
    FROM kara_tag kt4  
    INNER JOIN tag t4 ON kt4.FK_id_tag = t4.PK_id_tag AND t4.tagtype = 4
    WHERE k.PK_id_kara = kt4.FK_id_kara
    ) as creator
,(select GROUP_CONCAT( t4.NORM_name)
    FROM kara_tag kt4  
    INNER JOIN tag t4 ON kt4.FK_id_tag = t4.PK_id_tag AND t4.tagtype = 4
    WHERE k.PK_id_kara = kt4.FK_id_kara
    ) as NORM_creator
,(select GROUP_CONCAT( t5.name)
    FROM kara_tag kt5  
    INNER JOIN tag t5 ON kt5.FK_id_tag = t5.PK_id_tag AND t5.tagtype = 5
    WHERE k.PK_id_kara = kt5.FK_id_kara
    ) as [language]
,(select GROUP_CONCAT( t6.name)
    FROM kara_tag kt6  
    INNER JOIN tag t6 ON kt6.FK_id_tag = t6.PK_id_tag AND t6.tagtype = 6
    WHERE k.PK_id_kara = kt6.FK_id_kara
    ) as author
,(select GROUP_CONCAT( t6.NORM_name)
    FROM kara_tag kt6  
    INNER JOIN tag t6 ON kt6.FK_id_tag = t6.PK_id_tag AND t6.tagtype = 6
    WHERE k.PK_id_kara = kt6.FK_id_kara
    ) as NORM_author
,(select GROUP_CONCAT( t7.name)
    FROM kara_tag kt7  
    INNER JOIN tag t7 ON kt7.FK_id_tag = t7.PK_id_tag AND t7.tagtype = 7
    WHERE k.PK_id_kara = kt7.FK_id_kara
    ) as misc
,(select GROUP_CONCAT( t8.name)
    FROM kara_tag kt8  
    INNER JOIN tag t8 ON kt8.FK_id_tag = t8.PK_id_tag AND t8.tagtype = 8
    WHERE k.PK_id_kara = kt8.FK_id_kara
    ) as songwriter
,(select GROUP_CONCAT( t8.NORM_name)
    FROM kara_tag kt8  
    INNER JOIN tag t8 ON kt8.FK_id_tag = t8.PK_id_tag AND t8.tagtype = 8
    WHERE k.PK_id_kara = kt8.FK_id_kara
    ) as NORM_songwriter
FROM kara k
order by language, series, singer, songtype, songorder
