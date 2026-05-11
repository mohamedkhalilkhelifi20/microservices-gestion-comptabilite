'use strict';

const { open } = require('sqlite');
const sqlite3  = require('sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, 'ms1_identity.sqlite');

//  CONNEXION
async function initDatabase() {
    const db = await open({
        filename: DB_PATH,
        driver:   sqlite3.Database,
    });

    // Activer les foreign keys
    await db.run('PRAGMA foreign_keys = ON');

    // ── Table : cabinets ───────────────────────────
    await db.run(`
    CREATE TABLE IF NOT EXISTS cabinets (
      id         TEXT PRIMARY KEY,
      nom        TEXT NOT NULL,
      adresse    TEXT,
      email      TEXT UNIQUE NOT NULL,
      telephone  TEXT,
      created_at TEXT NOT NULL
    )
  `);

    // ── Table : comptables ─────────────────────────
    await db.run(`
    CREATE TABLE IF NOT EXISTS comptables (
      id             TEXT PRIMARY KEY,
      nom            TEXT NOT NULL,
      email          TEXT UNIQUE NOT NULL,
      telephone      TEXT,
      specialite     TEXT NOT NULL,
      cabinet_id     TEXT NOT NULL,
      ordre_ordinal  TEXT,
      numero_licence TEXT,
      created_at     TEXT NOT NULL,
      FOREIGN KEY (cabinet_id) REFERENCES cabinets(id)
    )
  `);

    // ── Table : clients ────────────────────────────
    await db.run(`
    CREATE TABLE IF NOT EXISTS clients (
      id               TEXT PRIMARY KEY,
      nom              TEXT NOT NULL,
      email            TEXT UNIQUE NOT NULL,
      telephone        TEXT,
      type             TEXT NOT NULL,
      matricule_fiscal TEXT,
      cabinet_id       TEXT NOT NULL,
      adresse          TEXT,
      created_at       TEXT NOT NULL,
      FOREIGN KEY (cabinet_id) REFERENCES cabinets(id)
    )
  `);

    // ── Table : comptable_client (N..N) ────────────
    await db.run(`
    CREATE TABLE IF NOT EXISTS comptable_client (
      id           TEXT PRIMARY KEY,
      comptable_id TEXT NOT NULL,
      client_id    TEXT NOT NULL,
      specialite   TEXT NOT NULL,
      date_debut   TEXT NOT NULL,
      statut       TEXT NOT NULL DEFAULT 'actif',
      FOREIGN KEY (comptable_id) REFERENCES comptables(id),
      FOREIGN KEY (client_id)    REFERENCES clients(id),
      UNIQUE (comptable_id, client_id, specialite)
    )
  `);

    console.log('[MS1] ✅ SQLite3 connecté et tables initialisées →', DB_PATH);
    return db;
}

// Export de la promesse — utilisée dans clientService.js
module.exports = initDatabase();
