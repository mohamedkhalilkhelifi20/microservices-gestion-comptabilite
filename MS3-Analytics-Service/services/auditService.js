'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

// Helpers

function now() {
    return new Date().toISOString();
}

//  Service

async function createAuditLog({
                                  client_id,
                                  action,
                                  entity_type,
                                  entity_id,
                                  performed_by,
                                  details = '{}',
                              }) {
    const db = await initDatabase();

    const doc = {
        id:           uuidv4(),
        client_id,
        action,
        entity_type,
        entity_id,
        performed_by,
        details,
        created_at:   now(),
    };

    await db.audit_logs.insert(doc);

    const rxDoc = await db.audit_logs.findOne(doc.id).exec();
    console.log(`[MS3][AuditService] Log créé → ${doc.id} | action: ${action} | entity: ${entity_type}:${entity_id}`);
    return rxDoc.toJSON();
}

async function getAuditLogsByClient({ client_id }) {
    const db      = await initDatabase();
    const results = await db.audit_logs.find({
        selector: { client_id },
    }).exec();
    return results.map(d => d.toJSON());
}

async function getAuditLogsByEntity({ entity_type, entity_id }) {
    const db      = await initDatabase();
    const results = await db.audit_logs.find({
        selector: { entity_type, entity_id },
    }).exec();
    return results.map(d => d.toJSON());
}

async function getAllAuditLogs() {
    const db      = await initDatabase();
    const results = await db.audit_logs.find().exec();
    return results.map(d => d.toJSON());
}

//Exports

module.exports = {
    createAuditLog,
    getAuditLogsByClient,
    getAuditLogsByEntity,
    getAllAuditLogs,
};
