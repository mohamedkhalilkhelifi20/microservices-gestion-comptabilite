'use strict';

const { createRxDatabase, addRxPlugin }   = require('rxdb');
const { getRxStorageMemory }              = require('rxdb/plugins/storage-memory');
const { RxDBDevModePlugin }               = require('rxdb/plugins/dev-mode');
const { wrappedValidateAjvStorage }       = require('rxdb/plugins/validate-ajv');

if (process.env.NODE_ENV !== 'production') {
    addRxPlugin(RxDBDevModePlugin);
}

//Schemas

const alerteSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:          { type: 'string', maxLength: 36 },
        client_id:   { type: 'string' },
        type:        { type: 'string' },  // echeance | impayee | anomalie
        message:     { type: 'string' },
        severity:    { type: 'string' },  // info | warning | critical
        entity_id:   { type: 'string', default: '' },
        entity_type: { type: 'string', default: '' },  // facture | declaration
        is_read:     { type: 'boolean', default: false },
        created_at:  { type: 'string' },
    },
    required: ['id', 'client_id', 'type', 'message', 'severity', 'created_at'],
};

const reportSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:         { type: 'string', maxLength: 36 },
        client_id:  { type: 'string' },
        type:       { type: 'string' },  // financier | fiscal | tresorerie
        periode:    { type: 'string' },  // ex: 2025-Q1 | 2025-01
        statut:     { type: 'string' },  // genere | valide | archive
        contenu:    { type: 'string', default: '{}' },  // JSON stringifié
        created_at: { type: 'string' },
    },
    required: ['id', 'client_id', 'type', 'periode', 'statut', 'created_at'],
};

const statSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:               { type: 'string', maxLength: 36 },
        client_id:        { type: 'string' },
        periode:          { type: 'string' },
        chiffre_affaires: { type: 'number', default: 0 },
        total_charges:    { type: 'number', default: 0 },
        tva_nette:        { type: 'number', default: 0 },
        resultat_net:     { type: 'number', default: 0 },
        nb_factures:      { type: 'integer', default: 0 },
        nb_declarations:  { type: 'integer', default: 0 },
        created_at:       { type: 'string' },
    },
    required: ['id', 'client_id', 'periode', 'created_at'],
};

const auditLogSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:           { type: 'string', maxLength: 36 },
        client_id:    { type: 'string' },
        action:       { type: 'string' },  // create | update | delete | submit | validate
        entity_type:  { type: 'string' },  // facture | declaration | alerte | report
        entity_id:    { type: 'string' },
        performed_by: { type: 'string' },  // user_id ou system
        details:      { type: 'string', default: '{}' },  // JSON stringifié
        created_at:   { type: 'string' },
    },
    required: ['id', 'client_id', 'action', 'entity_type', 'entity_id', 'performed_by', 'created_at'],
};

//Init DB

let db = null;

async function initDatabase() {
    if (db) return db;

    db = await createRxDatabase({
        name:    'ms3_analytics',
        storage: wrappedValidateAjvStorage({ storage: getRxStorageMemory() }),
        ignoreDuplicate: true,
    });

    await db.addCollections({
        alertes: {
            schema: alerteSchema,
        },
        reports: {
            schema: reportSchema,
        },
        stats: {
            schema: statSchema,
        },
        audit_logs: {
            schema: auditLogSchema,
        },
    });

    console.log('[MS3] RxDB initialisée — 4 collections : alertes, reports, stats, audit_logs');
    return db;
}

module.exports = initDatabase;
