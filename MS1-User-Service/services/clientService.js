'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

async function createClient({ nom, email, telephone, type, matricule_fiscal, cabinet_id, adresse }) {
    const db      = await initDatabase();
    const cabinet = await db.get(`SELECT id, nom FROM cabinets WHERE id = ?`, [cabinet_id]);
    if (!cabinet) throw new Error(`Cabinet non trouvé : ${cabinet_id}`);

    const id         = uuidv4();
    const created_at = new Date().toISOString();

    await db.run(
        `INSERT INTO clients
         (id, nom, email, telephone, type, matricule_fiscal, cabinet_id, adresse, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, nom, email, telephone, type, matricule_fiscal, cabinet_id, adresse, created_at]
    );
    return { id, nom, email, telephone, type, matricule_fiscal, cabinet_id, cabinet_nom: cabinet.nom, adresse, created_at };
}

async function getClient({ id }) {
    const db  = await initDatabase();
    const row = await db.get(
        `SELECT cl.*, cab.nom AS cabinet_nom FROM clients cl
         LEFT JOIN cabinets cab ON cl.cabinet_id = cab.id WHERE cl.id = ?`, [id]
    );
    if (!row) throw new Error(`Client non trouvé : ${id}`);
    return row;
}

async function getAllClients() {
    const db = await initDatabase();
    return db.all(
        `SELECT cl.*, cab.nom AS cabinet_nom FROM clients cl
         LEFT JOIN cabinets cab ON cl.cabinet_id = cab.id ORDER BY cl.nom`
    );
}

module.exports = { createClient, getClient, getAllClients };
