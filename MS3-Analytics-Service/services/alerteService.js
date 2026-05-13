'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../../MS2-document-service/db/database');
const { verifyClientExists } = require('../../MS2-document-service/grpc/ms1Client');

//CreateAlerte
async function createAlerte({ client_id, type, message, severity,
                                entity_id, entity_type }) {
    // Vérifier que le client existe dans MS1
    await verifyClientExists(client_id);

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

// GetAlertes
async function getAlertes({ client_id }) {
    const db   = await initDatabase();
    const docs = await db.alertes.find({
        selector: { client_id },
        sort:     [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => d.toJSON());
}

//  GetAllAlertes
async function getAllAlertes() {
    const db   = await initDatabase();
    const docs = await db.alertes.find({
        sort: [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => ({ ...d._data }));
}

module.exports = { createAlerte, getAlertes, getAllAlertes };
