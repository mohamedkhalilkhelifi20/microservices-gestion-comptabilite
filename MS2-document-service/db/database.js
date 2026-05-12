'use strict';

const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageMemory }            = require('rxdb/plugins/storage-memory');
const { RxDBDevModePlugin }             = require('rxdb/plugins/dev-mode');

if (process.env.NODE_ENV !== 'production') {
    addRxPlugin(RxDBDevModePlugin);
}

//Schemas

const factureSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:{ type: 'string', maxLength: 36 },
        type:{ type: 'string' },
        numero:{ type: 'string' },
        client_id:{ type: 'string' },
        client_nom:{ type: 'string' },
        comptable_id:{ type: 'string' },
        montant_ht:{ type: 'number' },
        tva_rate:{ type: 'number' },
        tva_montant:{ type: 'number' },
        montant_ttc:{ type: 'number' },
        statut:{ type: 'string' },
        signature_hash: { type: 'string', default: '' },
        signed_by:{ type: 'string', default: '' },
        signed_at: { type: 'string', default: '' },
        details_json:{ type: 'string' },
        created_at:{ type: 'string' },
    },
    required: ['id', 'type', 'numero', 'client_id', 'client_nom',
        'comptable_id', 'montant_ht', 'tva_rate', 'montant_ttc',
        'statut', 'details_json', 'created_at'],
};

const declarationSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 36 },
        client_id:{ type: 'string' },
        client_nom:{ type: 'string' },
        comptable_id: { type: 'string' },
        type: { type: 'string' },
        periode:{ type: 'string' },
        montant:{ type: 'number' },
        statut: { type: 'string' },
        validated_by: { type: 'string', default: '' },
        validated_at: { type: 'string', default: '' },
        created_at: { type: 'string' },
    },
    required: ['id', 'client_id', 'client_nom', 'comptable_id',
        'type', 'periode', 'montant', 'statut', 'created_at'],
};

const alerteSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:{ type: 'string', maxLength: 36 },
        client_id:{ type: 'string' },
        type:{ type: 'string' },
        message: { type: 'string' },
        severity:{ type: 'string' },
        entity_id: { type: 'string' },
        entity_type: { type: 'string' },
        is_read:{ type: 'boolean', default: false },
        created_at: { type: 'string' },
    },
    required: ['id', 'client_id', 'type', 'message',
        'severity', 'entity_id', 'entity_type', 'created_at'],
};

// Singleton

let dbInstance = null;

async function initDatabase() {
    if (dbInstance) return dbInstance;

    const db = await createRxDatabase({
        name:'ms2_documents',
        storage:getRxStorageMemory(),
        ignoreDuplicate: true,
    });

    await db.addCollections({
        factures:{ schema: factureSchema },
        declarations: { schema: declarationSchema },
        alertes:{ schema: alerteSchema },
    });

    dbInstance = db;
    console.log('[MS2] RxDB initialisé — 3 collections : factures, declarations, alertes');
    return dbInstance;
}

module.exports = initDatabase;
