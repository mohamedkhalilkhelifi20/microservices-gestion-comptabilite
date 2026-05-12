'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

//CreateAlerte

async function createAlerte({ client_id, type, message, severity,
                                entity_id, entity_type }) {
    const db = await initDatabase();

    const doc = {
        id:          uuidv4(),
        client_id,
        type,
        message,
        severity,
        entity_id,
        entity_type,
        is_read:     false,
        created_at:  new Date().toISOString(),
    };

    const rxDoc = await db.alertes.insert(doc);
    console.log(`[MS2] Alerte créée → ${doc.id} (${severity} | ${type})`);
    return rxDoc.toJSON();
}

//GetAlertes

async function getAlertes({ client_id, unread_only }) {
    const db = await initDatabase();

    const selector = unread_only
        ? { client_id, is_read: false }
        : { client_id };

    const docs = await db.alertes.find({
        selector,
        sort: [{ created_at: 'desc' }],
    }).exec();

    return docs.map(d => d.toJSON());
}

module.exports = { createAlerte, getAlertes };
