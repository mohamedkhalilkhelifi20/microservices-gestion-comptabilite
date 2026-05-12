'use strict';

const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStorageLoki } = require('rxdb/plugins/storage-lokijs');
const { RxDBDevModePlugin } = require('rxdb/plugins/dev-mode');

// Dev mode uniquement hors production
if (process.env.NODE_ENV !== 'production') {
    addRxPlugin(RxDBDevModePlugin);
}

// ── Schemas
const factureSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:             { type: 'string', maxLength: 36 },
        type:           { type: 'string' }, // standard | steg | sonede | internet | telephone | loyer | honoraires
        numero:         { type: 'string' },
        client_id:      { type: 'string' },
        client_nom:     { type: 'string' }, // dénormalisé depuis MS1
        comptable_id:   { type: 'string' },
        montant_ht:     { type: 'number' },
        tva_rate:       { type: 'number' }, // 7 | 13 | 19
        tva_montant:    { type: 'number' },
        montant_ttc:    { type: 'number' },
        statut:         { type: 'string' }, // brouillon | validee | signee | envoyee | payee
        signature_hash: { type: 'string', default: '' },
        signed_by:      { type: 'string', default: '' },
        signed_at:      { type: 'string', default: '' },
        details_json:   { type: 'string' }, // JSON.stringify des détails spécifiques au type
        created_at:     { type: 'string' },
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
        id:           { type: 'string', maxLength: 36 },
        client_id:    { type: 'string' },
        client_nom:   { type: 'string' }, // dénormalisé
        comptable_id: { type: 'string' },
        type:         { type: 'string' }, // TVA | IS | IRPP | CNSS
        periode:      { type: 'string' }, // "2026-Q1" | "2026-05"
        montant:      { type: 'number' },
        statut:       { type: 'string' }, // brouillon | soumise | validee
        validated_by: { type: 'string', default: '' },
        validated_at: { type: 'string', default: '' },
        created_at:   { type: 'string' },
    },
    required: ['id', 'client_id', 'client_nom', 'comptable_id',
        'type', 'periode', 'montant', 'statut', 'created_at'],
};

const alerteSchema = {
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id:          { type: 'string', maxLength: 36 },
        client_id:   { type: 'string' },
        type:        { type: 'string' }, // echeance | impayee | anomalie
        message:     { type: 'string' },
        severity:    { type: 'string' }, // info | warning | critical
        entity_id:   { type: 'string' },
        entity_type: { type: 'string' }, // facture | declaration
        is_read:     { type: 'boolean', default: false },
        created_at:  { type: 'string' },
    },
    required: ['id', 'client_id', 'type', 'message',
        'severity', 'entity_id', 'entity_type', 'created_at'],
};


let dbInstance = null;

async function initDatabase() {
    if (dbInstance) return dbInstance;

    const db = await createRxDatabase({
        name:    'ms2_documents',
        storage: getRxStorageLoki({
            // LokiJS persiste sur disque en JSON
            adapter: new (require('lokijs/src/lokijs'))(),
        }),
        ignoreDuplicate: false,
    });

    await db.addCollections({
        factures:     { schema: factureSchema },
        declarations: { schema: declarationSchema },
        alertes:      { schema: alerteSchema },
    });

    dbInstance = db;
    console.log('[MS2] RxDB + LokiJS initialisé — 3 collections : factures, declarations, alertes');
    return dbInstance;
}

module.exports = initDatabase;
