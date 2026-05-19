'use strict';

const { v4: uuidv4 } = require('uuid');
const initDatabase   = require('../db/database');
const grpcClients = require('../grpc/grpcClients');
// Helpers

function now() {
    return new Date().toISOString();
}

// Service

async function createReport({ client_id, type, periode, facture_id = null, declaration_id = null }) {
    const db = await initDatabase();

    // 1 — Récupérer les données enrichies depuis MS1 et MS2 via gRPC
    let contenu = {};

    try {
        // Données client depuis MS1
        const clientData = await grpcClients.getClient({ id: client_id });
        contenu.client = {
            id:       clientData.client.id,
            nom:      clientData.client.nom,
            email:    clientData.client.email,
            matricule_fiscal: clientData.client.matricule_fiscal,
        };
    } catch (err) {
        console.warn(`[MS3][ReportService] getClient MS1 failed: ${err.message}`);
        contenu.client = { id: client_id };
    }

    try {
        // Données facture depuis MS2 si disponible
        if (facture_id) {
            const invoiceData = await grpcClients.getInvoice({ id: facture_id });
            contenu.facture = {
                id:          invoiceData.invoice.id,
                numero:      invoiceData.invoice.numero,
                montant_ht:  invoiceData.invoice.montant_ht,
                tva_montant: invoiceData.invoice.tva_montant,
                montant_ttc: invoiceData.invoice.montant_ttc,
                statut:      invoiceData.invoice.statut,
            };
        }
    } catch (err) {
        console.warn(`[MS3][ReportService] getFacture MS2 failed: ${err.message}`);
    }

    try {
        // Données déclaration depuis MS2 si disponible
        if (declaration_id) {
            const declarationData = await grpcClients.getDeclaration({ id: declaration_id });
            contenu.declaration = {
                id:      declarationData.declaration.id,
                type:    declarationData.declaration.type,
                periode: declarationData.declaration.periode,
                montant: declarationData.declaration.montant,
                statut:  declarationData.declaration.statut,
            };
        }
    } catch (err) {
        console.warn(`[MS3][ReportService] getDeclaration MS2 failed: ${err.message}`);
    }

    // 2 — Créer le rapport avec contenu enrichi
    const doc = {
        id:         uuidv4(),
        client_id,
        type,
        periode,
        statut:     'genere',
        contenu:    JSON.stringify(contenu),
        created_at: now(),
    };

    await db.reports.insert(doc);

    const rxDoc = await db.reports.findOne(doc.id).exec();
    console.log(`[MS3][ReportService] Rapport créé → ${doc.id} | type: ${type} | periode: ${periode} | client: ${client_id}`);
    return rxDoc.toJSON();
}

async function getReport({ id }) {
    const db    = await initDatabase();
    const rxDoc = await db.reports.findOne(id).exec();
    if (!rxDoc) throw new Error(`Rapport introuvable : ${id}`);
    return rxDoc.toJSON();
}

async function getReportsByClient({ client_id }) {
    const db      = await initDatabase();
    const results = await db.reports.find({
        selector: { client_id },
    }).exec();
    return results.map(d => d.toJSON());
}

async function getAllReports() {
    const db      = await initDatabase();
    const results = await db.reports.find().exec();
    return results.map(d => d.toJSON());
}

async function updateReport({ id, statut, contenu }) {
    const db    = await initDatabase();
    const rxDoc = await db.reports.findOne(id).exec();
    if (!rxDoc) throw new Error(`Rapport introuvable : ${id}`);

    const patch = {};
    if (statut)  patch.statut  = statut;
    if (contenu) patch.contenu = contenu;

    await rxDoc.patch(patch);

    const updated = await db.reports.findOne(id).exec();
    console.log(`[MS3][ReportService] Rapport mis à jour → ${id} | statut: ${statut}`);
    return updated.toJSON();
}

async function deleteReport({ id }) {
    const db    = await initDatabase();
    const rxDoc = await db.reports.findOne(id).exec();
    if (!rxDoc) throw new Error(`Rapport introuvable : ${id}`);

    await rxDoc.remove();
    console.log(`[MS3][ReportService] Rapport supprimé → ${id}`);
    return { success: true, message: `Rapport ${id} supprimé avec succès` };
}

//Exports

module.exports = {
    createReport,
    getReport,
    getReportsByClient,
    getAllReports,
    updateReport,
    deleteReport,
};
