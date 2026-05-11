'use strict';

const { v4: uuidv4 } = require('uuid');
const dbPromise      = require('../db/database');


//  ASSIGNATION N..N — Comptable ↔ Client
async function assignComptableToClient({ comptable_id, client_id, specialite }) {
    const db = await dbPromise;

    const comptable = await db.get(
        `SELECT id FROM comptables WHERE id = ?`, [comptable_id]
    );
    if (!comptable) throw new Error(`Comptable non trouvé : ${comptable_id}`);

    const client = await db.get(
        `SELECT id FROM clients WHERE id = ?`, [client_id]
    );
    if (!client) throw new Error(`Client non trouvé : ${client_id}`);

    const id         = uuidv4();
    const date_debut = new Date().toISOString();

    await db.run(
        `INSERT OR REPLACE INTO comptable_client
     (id, comptable_id, client_id, specialite, date_debut, statut)
     VALUES (?, ?, ?, ?, ?, 'actif')`,
        [id, comptable_id, client_id, specialite, date_debut]
    );

    return {
        success: true,
        message: `Comptable ${comptable_id} assigné au client ${client_id}`
    };
}

async function getAssignationsByClient({ client_id }) {
    const db = await dbPromise;
    return db.all(
        `SELECT cc.*, c.nom AS comptable_nom, c.email AS comptable_email
     FROM comptable_client cc
     LEFT JOIN comptables c ON cc.comptable_id = c.id
     WHERE cc.client_id = ? AND cc.statut = 'actif'
     ORDER BY cc.date_debut DESC`,
        [client_id]
    );
}

module.exports = {
    assignComptableToClient,
    getAssignationsByClient,
};
