'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

async function createComptable({ nom, email, telephone, specialite, cabinet_id, ordre_ordinal, numero_licence }) {
    const db      = await initDatabase();
    const cabinet = await db.get(`SELECT id, nom FROM cabinets WHERE id = ?`, [cabinet_id]);
    if (!cabinet) throw new Error(`Cabinet non trouvé : ${cabinet_id}`);

    const id         = uuidv4();
    const created_at = new Date().toISOString();

    await db.run(
        `INSERT INTO comptables
         (id, nom, email, telephone, specialite, cabinet_id, ordre_ordinal, numero_licence, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, nom, email, telephone, specialite, cabinet_id, ordre_ordinal, numero_licence, created_at]
    );
    return { id, nom, email, telephone, specialite, cabinet_id, cabinet_nom: cabinet.nom, ordre_ordinal, numero_licence, created_at };
}

async function getComptable({ id }) {
    const db  = await initDatabase();
    const row = await db.get(
        `SELECT c.*, cab.nom AS cabinet_nom FROM comptables c
         LEFT JOIN cabinets cab ON c.cabinet_id = cab.id WHERE c.id = ?`, [id]
    );
    if (!row) throw new Error(`Comptable non trouvé : ${id}`);
    return row;
}

async function getAllComptables() {
    const db = await initDatabase();
    return db.all(
        `SELECT c.*, cab.nom AS cabinet_nom FROM comptables c
         LEFT JOIN cabinets cab ON c.cabinet_id = cab.id ORDER BY c.nom`
    );
}

async function getComptablesBySpecialite({ specialite }) {
    const db = await initDatabase();
    return db.all(
        `SELECT c.*, cab.nom AS cabinet_nom FROM comptables c
         LEFT JOIN cabinets cab ON c.cabinet_id = cab.id
         WHERE c.specialite = ? ORDER BY c.nom`, [specialite]
    );
}

module.exports = { createComptable, getComptable, getAllComptables, getComptablesBySpecialite };
