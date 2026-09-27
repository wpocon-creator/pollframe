import {DatabaseSync} from 'node:sqlite';
import {getMigrations} from 'better-auth/db/migration';
import {mkdir,writeFile} from 'node:fs/promises';
import {accountOptions} from '../server/account-options.mjs';
const database=new DatabaseSync(':memory:');
const options=accountOptions({database,secret:'schema-only-not-a-production-secret-000000000000',send:()=>async()=>{throw Error('No mail in schema generation');}});
const {compileMigrations}=await getMigrations(options);
const sql=await compileMigrations();
await mkdir(new URL('../migrations/accounts/',import.meta.url),{recursive:true});
await writeFile(new URL('../migrations/accounts/0001_accounts.sql',import.meta.url),sql+`
CREATE TABLE studio_document(id TEXT NOT NULL, owner TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
kind TEXT NOT NULL CHECK(kind IN ('design','style')), name TEXT NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(owner,id));
CREATE INDEX studio_document_owner ON studio_document(owner);
CREATE TABLE mail_budget(period TEXT PRIMARY KEY,n INTEGER NOT NULL);
`);
database.close();
