'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');

//Helpers

function now() {
    return new Date().toISOString();
}

function getPeriode() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

//Service

/**
 * Appelé automatiquement par le Kafka consumer
 * quand un event invoice.created ou declaration.submitted est reçu.
 * Recalcule et met à jour les KPIs du client pour la période courante.
 */
async function calculateAndSaveStats({ client_id, montant_ht = 0, tva_montant = 0, type_event }) {
    const db      = await initDatabase();
    const periode = getPeriode();

    // Chercher si une stat existe déjà pour ce client + cette période
    const existing = await db.stats.findOne({
        selector: { client_id, periode },
    }).exec();

    if (existing) {
        // Mettre à jour les KPIs existants
        const patch = {};

        if (type_event === 'invoice.created') {
            patch.chiffre_affaires = (existing.chiffre_affaires || 0) + montant_ht;
            patch.tva_nette  = (existing.tva_nette || 0) + tva_montant;
            patch.nb_factures  = (existing.nb_factures || 0) + 1;
        }

        if (type_event === 'declaration.submitted') {
            patch.total_charges   = (existing.total_charges  || 0) + montant_ht;
            patch.nb_declarations = (existing.nb_declarations || 0) + 1;
        }

        // Recalculer le résultat net
        const ca= patch.chiffre_affaires ?? existing.chiffre_affaires;
        const charges = patch.total_charges    ?? existing.total_charges;
        patch.resultat_net = ca - charges;

        await existing.patch(patch);

        const updated = await db.stats.findOne(existing.id).exec();
        console.log(`[MS3][StatService] KPIs mis à jour → client: ${client_id} | periode: ${periode} | event: ${type_event}`);
        return updated.toJSON();

    } else {
        // ── Créer une nouvelle stat pour cette période
        const chiffre_affaires = type_event === 'invoice.created'      ? montant_ht   : 0;
        const total_charges    = type_event === 'declaration.submitted' ? montant_ht   : 0;
        const tva_nette        = type_event === 'invoice.created'      ? tva_montant  : 0;
        const nb_factures      = type_event === 'invoice.created'      ? 1            : 0;
        const nb_declarations  = type_event === 'declaration.submitted' ? 1            : 0;
        const resultat_net     = chiffre_affaires - total_charges;

        const doc = {
            id: uuidv4(),
            client_id,
            periode,
            chiffre_affaires,
            total_charges,
            tva_nette,
            resultat_net,
            nb_factures,
            nb_declarations,
            created_at: now(),
        };

        await db.stats.insert(doc);

        const rxDoc = await db.stats.findOne(doc.id).exec();
        console.log(`[MS3][StatService] KPIs créés → client: ${client_id} | periode: ${periode} | event: ${type_event}`);
        return rxDoc.toJSON();
    }
}

async function getStat({ id }) {
    const db    = await initDatabase();
    const rxDoc = await db.stats.findOne(id).exec();
    if (!rxDoc) throw new Error(`Stat introuvable : ${id}`);
    return rxDoc.toJSON();
}

async function getStatsByClient({ client_id }) {
    const db      = await initDatabase();
    const results = await db.stats.find({
        selector: { client_id },
    }).exec();
    return results.map(d => d.toJSON());
}

async function getAllStats() {
    const db      = await initDatabase();
    const results = await db.stats.find().exec();
    return results.map(d => d.toJSON());
}

//Exports

module.exports = {
    calculateAndSaveStats,
    getStat,
    getStatsByClient,
    getAllStats,
};
