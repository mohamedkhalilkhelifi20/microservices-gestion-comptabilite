'use strict';

const { v4: uuidv4 }    = require('uuid');
const crypto            = require('crypto');
const initDatabase      = require('../db/database');
const { verifyClientExists, verifyComptableExists, verifyAssignation } = require('../grpc/ms1Client');

//Helpers

function calcTva(montant_ht, tva_rate) {
    const tva_montant = parseFloat((montant_ht * tva_rate / 100).toFixed(3));
    const montant_ttc = parseFloat((montant_ht + tva_montant).toFixed(3));
    return { tva_montant, montant_ttc };
}

function generateNumero(type) {
    const prefix = type.toUpperCase().slice(0, 3);
    const date   = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand   = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${date}-${rand}`;
}

// CreateInvoice
async function createInvoice({ type, client_id, client_nom, comptable_id,
                                 montant_ht, tva_rate, details_json }) {
    // 1. Vérifier que le client existe dans MS1
    await verifyClientExists(client_id);

    // 2. Vérifier que le comptable existe dans MS1
    await verifyComptableExists(comptable_id);

    // 3. Vérifier que l'assignation client↔comptable est active dans MS1
    await verifyAssignation(client_id, comptable_id);

    const db = await initDatabase();
    const { tva_montant, montant_ttc } = calcTva(montant_ht, tva_rate);

    const doc = {
        id:             uuidv4(),
        type,
        numero:         generateNumero(type),
        client_id,
        client_nom,
        comptable_id,
        montant_ht,
        tva_rate,
        tva_montant,
        montant_ttc,
        statut:         'brouillon',
        signature_hash: '',
        signed_by:      '',
        signed_at:      '',
        details_json:   details_json || '{}',
        created_at:     new Date().toISOString(),
    };

    const rxDoc = await db.factures.insert(doc);
    console.log(`[MS2] Facture créée → ${doc.id} (${type} | ${doc.numero})`);
    return rxDoc.toJSON();
}

// UpdateInvoice
async function updateInvoice({ invoice_id, montant_ht, tva_rate, details_json }) {
    const db  = await initDatabase();
    const doc = await db.factures.findOne(invoice_id).exec();

    if (!doc) throw new Error(`Facture non trouvée : ${invoice_id}`);

    // Règle métier : seul un brouillon est modifiable
    if (doc.statut !== 'brouillon') {
        throw new Error(
            `Impossible de modifier la facture ${invoice_id} — statut actuel : "${doc.statut}". Seuls les brouillons sont modifiables.`
        );
    }

    const patch = {};

    if (montant_ht && montant_ht > 0) {
        const rate            = tva_rate && tva_rate > 0 ? tva_rate : doc.tva_rate;
        const { tva_montant, montant_ttc } = calcTva(montant_ht, rate);
        patch.montant_ht  = montant_ht;
        patch.tva_rate    = rate;
        patch.tva_montant = tva_montant;
        patch.montant_ttc = montant_ttc;
    } else if (tva_rate && tva_rate > 0) {
        const { tva_montant, montant_ttc } = calcTva(doc.montant_ht, tva_rate);
        patch.tva_rate    = tva_rate;
        patch.tva_montant = tva_montant;
        patch.montant_ttc = montant_ttc;
    }

    if (details_json && details_json !== '') {
        patch.details_json = details_json;
    }

    if (Object.keys(patch).length === 0) {
        throw new Error('Aucun champ à modifier fourni.');
    }

    await doc.patch(patch);
    console.log(`[MS2] Facture mise à jour → ${invoice_id}`);
    return doc.toJSON();
}

// DeleteInvoice
async function deleteInvoice({ invoice_id }) {
    const db  = await initDatabase();
    const doc = await db.factures.findOne(invoice_id).exec();

    if (!doc) throw new Error(`Facture non trouvée : ${invoice_id}`);

    // Règle métier : seul un brouillon est supprimable
    if (doc.statut !== 'brouillon') {
        throw new Error(
            `Impossible de supprimer la facture ${invoice_id} — statut actuel : "${doc.statut}". Seuls les brouillons sont supprimables.`
        );
    }

    await doc.remove();
    console.log(`[MS2] Facture supprimée → ${invoice_id}`);
    return { success: true, message: `Facture ${invoice_id} supprimée avec succès` };
}

// SignInvoice
async function signInvoice({ invoice_id, comptable_id }) {
    const db  = await initDatabase();
    const doc = await db.factures.findOne(invoice_id).exec();

    if (!doc) throw new Error(`Facture non trouvée : ${invoice_id}`);
    if (doc.statut === 'signee') throw new Error(`Facture déjà signée : ${invoice_id}`);
    if (doc.statut === 'brouillon') throw new Error(
        `Facture encore en brouillon : ${invoice_id}. Veuillez la valider avant de la signer.`
    );

    // Vérifier que le comptable signataire est bien assigné à ce client
    await verifyAssignation(doc.client_id, comptable_id);

    const signed_at = new Date().toISOString();
    const content   = {
        invoice_id,
        numero:      doc.numero,
        client_id:   doc.client_id,
        montant_ttc: doc.montant_ttc,
        comptable_id,
        signed_at,
    };
    const signature_hash = crypto
        .createHash('sha256')
        .update(JSON.stringify(content))
        .digest('hex');

    await doc.patch({ statut: 'signee', signature_hash, signed_by: comptable_id, signed_at });
    console.log(`[MS2] Facture signée → ${invoice_id} | hash: ${signature_hash.slice(0, 12)}...`);
    return { success: true, signature_hash, signed_at };
}

//GetInvoice
async function getInvoice({ id }) {
    const db  = await initDatabase();
    const doc = await db.factures.findOne(id).exec();
    if (!doc) throw new Error(`Facture non trouvée : ${id}`);
    return doc.toJSON();
}

// GetClientInvoices
async function getClientInvoices({ client_id }) {
    const db   = await initDatabase();
    const docs = await db.factures.find({
        selector: { client_id },
        sort:     [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => d.toJSON());
}

//GetAllInvoices
async function getAllInvoices() {
    const db   = await initDatabase();
    const docs = await db.factures.find({
        sort: [{ created_at: 'desc' }],
    }).exec();
    return docs.map(d => ({ ...d._data }));
}

module.exports = {
    createInvoice, updateInvoice, deleteInvoice,
    signInvoice, getInvoice, getClientInvoices, getAllInvoices,
};
