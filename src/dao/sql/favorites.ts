// SQL for favorites management

export const sqlgetFavoritesMicro = (limitClause: string, offsetClause: string) => `
SELECT
  fk_kid AS kid
  FROM favorites
  WHERE fk_login = :username
${limitClause}
${offsetClause}
`;

export const sqlremoveFavorites = `
DELETE FROM favorites
WHERE fk_kid = $1
  AND fk_login = $2;
`;

export const sqlclearFavorites = `
DELETE FROM favorites
WHERE fk_login = $1;
`;

export const sqlinsertFavorites = `
INSERT INTO favorites(fk_kid, fk_login)
VALUES ($1, $2) ON CONFLICT DO NOTHING
`;
