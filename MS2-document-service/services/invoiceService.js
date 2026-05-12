'use strict';

const { v4: uuidv4 } = require('uuid');
const crypto= require('crypto');
const initDatabase= require('../db/database');

// ── Helpers ────────────────────────────────────────────────────────────────

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

//CreateInvoice
async function createInvoice({ type, client_id, client_nom, comptable_id,
                                 montant_ht, tva_rate, details_json }) {
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

// ── SignInvoice
async function signInvoice({ invoice_id, comptable_id }) {
    const db  = await initDatabase();
    const doc = await db.factures.findOne(invoice_id).exec();
    if (!doc) throw new Error(`Facture non trouvée : ${invoice_id}`);
    if (doc.statut === 'signee') throw new Error(`Facture déjà signée : ${invoice_id}`);

    const signed_at = new Date().toISOString();

    const content = {
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

    await doc.patch({
        statut: 'signee',
        signature_hash,
        signed_by: comptable_id,
        signed_at,
    });

    console.log(`[MS2] Facture signée → ${invoice_id} | hash: ${signature_hash.slice(0, 12)}...`);
    return { success: true, message: `Facture ${doc.numero} signée`, signature_hash };
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

module.exports = { createInvoice, signInvoice, getInvoice, getClientInvoices };
