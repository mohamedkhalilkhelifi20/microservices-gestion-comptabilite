'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

function now() {
    return new Date().toISOString();
}


async function createAlerte({ client_id, type, message, severity, entity_id = '', entity_type = '' }) {
    const db = await initDatabase();

    const doc = {
        id:          uuidv4(),
        client_id,
        type,
        message,
        severity,
        entity_id,
        entity_type,
        is_read:    false,
        created_at: now(),
    };

    await db.alertes.insert(doc);

    const rxDoc = await db.alertes.findOne(doc.id).exec();
    console.log(`[MS3][AlerteService] Alerte créée → ${doc.id} | type: ${type} | severity: ${severity}`);
    return rxDoc.toJSON();
}

async function getAlertes({ client_id }) {
    const db      = await initDatabase();
    const results = await db.alertes.find({
        selector: { client_id },
        sort:     [{ created_at: 'desc' }],
    }).exec();
    return results.map(d => d.toJSON());
}

async function getAllAlertes() {
    const db      = await initDatabase();
    const results = await db.alertes.find({
        sort: [{ created_at: 'desc' }],
    }).exec();
    return results.map(d => d.toJSON());
}


module.exports = { createAlerte, getAlertes, getAllAlertes };
