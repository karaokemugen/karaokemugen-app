-- Up

UPDATE user SET avatar_file = 'blank.png' WHERE avatar_file = 'blank.jpg';

-- Down

UPDATE user SET avatar_file = 'blank.jpg' WHERE avatar_file = 'blank.png';