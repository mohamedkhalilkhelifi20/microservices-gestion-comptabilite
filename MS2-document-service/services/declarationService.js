'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

// ── CreateDeclaration
async function createDeclaration({ client_id, client_nom, comptable_id,
                                     type, periode, montant }) {
    const db = await initDatabase();

    // Unicité métier : un seul brouillon par client/type/période
    const existing = await db.declarations.findOne({
        selector: { client_id, type, periode, statut: 'brouillon' },
    }).exec();
    if (existing) throw new Error(
        `Déclaration ${type} déjà en brouillon pour ${client_nom} — période ${periode}`
    );

    const doc = {
        id:           uuidv4(),
        client_id,
        client_nom,
        comptable_id,
        type,
        periode,
        montant,
        statut:       'brouillon',
        validated_by: '',
        validated_at: '',
        created_at:   new Date().toISOString(),
    };

    const rxDoc = await db.declarations.insert(doc);
    console.log(`[MS2] Déclaration créée → ${doc.id} (${type} | ${periode})`);
    return rxDoc.toJSON();
}

// ValidateDeclaration
async function validateDeclaration({ declaration_id, comptable_id }) {
    const db  = await initDatabase();
    const doc = await db.declarations.findOne(declaration_id).exec();
    if (!doc) throw new Error(`Déclaration non trouvée : ${declaration_id}`);
    if (doc.statut === 'validee') throw new Error(`Déclaration déjà validée : ${declaration_id}`);

    const validated_at = new Date().toISOString();

    await doc.patch({
        statut:       'validee',
        validated_by: comptable_id,
        validated_at,
    });

    console.log(`[MS2] Déclaration validée → ${declaration_id}`);
    return doc.toJSON();
}

// ── GetDeclaration
async function getDeclaration({ id }) {
    const db  = await initDatabase();
    const doc = await db.declarations.findOne(id).exec();
    if (!doc) throw new Error(`Déclaration non trouvée : ${id}`);
    return doc.toJSON();
}

async function getClientDeclarations({ client_id }) {
    const db   = await initDatabase();
    const docs = await db.declarations.find({
        selector: { client_id },
        sort:     [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => ({ ...d._data }));
}

async function getAllDeclarations() {
    const db   = await initDatabase();
    const docs = await db.declarations.find({
        sort: [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => ({ ...d._data }));
}

module.exports = { createDeclaration, validateDeclaration, getDeclaration,
    getClientDeclarations, getAllDeclarations };

