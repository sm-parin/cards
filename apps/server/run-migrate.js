'use strict';
process.env.DATABASE_URL = 'postgresql://neondb_owner:npg_mGMvSWB1ayK7@ep-weathered-morning-a1s9cdqx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const { runMigrations } = require('./src/db/migrate');
runMigrations()
  .then(() => { console.log('MIGRATIONS OK'); process.exit(0); })
  .catch(err => { console.error('MIGRATION FAILED:', err.message); process.exit(1); });
