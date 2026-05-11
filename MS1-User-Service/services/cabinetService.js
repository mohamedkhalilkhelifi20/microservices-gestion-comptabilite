'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

async function createCabinet({ nom, adresse, email, telephone }) {
    const db         = await initDatabase();
    const id         = uuidv4();
    const created_at = new Date().toISOString();

    await db.run(
        `INSERT INTO cabinets (id, nom, adresse, email, telephone, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, nom, adresse, email, telephone, created_at]
    );
    return { id, nom, adresse, email, telephone, created_at };
}

async function getCabinet({ id }) {
    const db  = await initDatabase();
    const row = await db.get(`SELECT * FROM cabinets WHERE id = ?`, [id]);
    if (!row) throw new Error(`Cabinet non trouvé : ${id}`);
    return row;
}

async function getAllCabinets() {
    const db = await initDatabase();
    return db.all(`SELECT * FROM cabinets ORDER BY nom`);
}

module.exports = { createCabinet, getCabinet, getAllCabinets };
