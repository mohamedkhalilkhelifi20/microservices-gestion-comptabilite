'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');
const { verifyClientExists, verifyComptableExists, verifyAssignation } = require('../grpc/ms1Client');

//CreateDeclaration
async function createDeclaration({ client_id, client_nom, comptable_id,
                                     type, periode, montant }) {
    // 1. Vérifier que le client existe dans MS1
    await verifyClientExists(client_id);

    // 2. Vérifier que le comptable existe dans MS1
    await verifyComptableExists(comptable_id);

    // 3. Vérifier que l'assignation client↔comptable est active dans MS1
    await verifyAssignation(client_id, comptable_id);

    const db = await initDatabase();

    // 4. Unicité métier : un seul brouillon par client/type/période
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

// UpdateDeclaration
async function updateDeclaration({ declaration_id, montant, periode }) {
    const db  = await initDatabase();
    const doc = await db.declarations.findOne(declaration_id).exec();

    if (!doc) throw new Error(`Déclaration non trouvée : ${declaration_id}`);

    // Règle métier : seul un brouillon est modifiable
    if (doc.statut !== 'brouillon') {
        throw new Error(
            `Impossible de modifier la déclaration ${declaration_id} — statut actuel : "${doc.statut}". Seuls les brouillons sont modifiables.`
        );
    }

    const patch = {};

    if (montant && montant > 0)      patch.montant = montant;
    if (periode && periode !== '')   patch.periode  = periode;

    if (Object.keys(patch).length === 0) {
        throw new Error('Aucun champ à modifier fourni.');
    }

    // Si on change la période, vérifier qu'il n'existe pas déjà un brouillon pour cette nouvelle période
    if (patch.periode) {
        const conflict = await db.declarations.findOne({
            selector: {
                client_id: doc.client_id,
                type:      doc.type,
                periode:   patch.periode,
                statut:    'brouillon',
            },
        }).exec();
        if (conflict && conflict.id !== declaration_id) {
            throw new Error(
                `Déclaration ${doc.type} déjà en brouillon pour la période ${patch.periode}`
            );
        }
    }

    await doc.patch(patch);
    console.log(`[MS2] Déclaration mise à jour → ${declaration_id}`);
    return doc.toJSON();
}

// DeleteDeclaration
async function deleteDeclaration({ declaration_id }) {
    const db  = await initDatabase();
    const doc = await db.declarations.findOne(declaration_id).exec();

    if (!doc) throw new Error(`Déclaration non trouvée : ${declaration_id}`);

    // Règle métier : seul un brouillon est supprimable
    if (doc.statut !== 'brouillon') {
        throw new Error(
            `Impossible de supprimer la déclaration ${declaration_id} — statut actuel : "${doc.statut}". Seuls les brouillons sont supprimables.`
        );
    }

    await doc.remove();
    console.log(`[MS2] Déclaration supprimée → ${declaration_id}`);
    return { success: true, message: `Déclaration ${declaration_id} supprimée avec succès` };
}

// ValidateDeclaration
async function validateDeclaration({ declaration_id, comptable_id }) {
    const db  = await initDatabase();
    const doc = await db.declarations.findOne(declaration_id).exec();

    if (!doc) throw new Error(`Déclaration non trouvée : ${declaration_id}`);
    if (doc.statut === 'validee') throw new Error(`Déclaration déjà validée : ${declaration_id}`);

    // Vérifier que le comptable validateur est bien assigné à ce client
    await verifyAssignation(doc.client_id, comptable_id);

    const validated_at = new Date().toISOString();
    await doc.patch({ statut: 'validee', validated_by: comptable_id, validated_at });

    console.log(`[MS2] Déclaration validée → ${declaration_id}`);
    return doc.toJSON();
}

//GetDeclaration
async function getDeclaration({ id }) {
    const db  = await initDatabase();
    const doc = await db.declarations.findOne(id).exec();
    if (!doc) throw new Error(`Déclaration non trouvée : ${id}`);
    return doc.toJSON();
}

//GetClientDeclarations
async function getClientDeclarations({ client_id }) {
    const db   = await initDatabase();
    const docs = await db.declarations.find({
        selector: { client_id },
        sort:     [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => ({ ...d._data }));
}

// GetAllDeclarations
async function getAllDeclarations() {
    const db   = await initDatabase();
    const docs = await db.declarations.find({
        sort: [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => ({ ...d._data }));
}

module.exports = {
    createDeclaration, updateDeclaration, deleteDeclaration,
    validateDeclaration, getDeclaration, getClientDeclarations, getAllDeclarations,
};
