// @ts-nocheck
db.createUser({
  user: _getEnv("DB_USERNAME"),
  pwd: _getEnv("DB_PASSWORD"),
  roles: [
    {
      role: "readWrite",
      db: _getEnv("MONGO_INITDB_DATABASE"),
    },
  ],
});
