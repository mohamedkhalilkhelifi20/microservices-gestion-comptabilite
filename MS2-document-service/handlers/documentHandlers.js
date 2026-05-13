'use strict';

const grpc             = require('@grpc/grpc-js');
const invoiceService   = require('../services/invoiceService');
const declService      = require('../services/declarationService');
const alerteService    = require('../services/alerteService');
const kafka            = require('../kafka/producer');

// ── Helper
function grpcError(err) {
    const msg = err.message || '';
    if (msg.includes('non trouvée') || msg.includes('introuvable')) return grpc.status.NOT_FOUND;
    if (msg.includes('déjà'))                                        return grpc.status.ALREADY_EXISTS;
    if (msg.includes('Impossible') || msg.includes('Aucune'))        return grpc.status.FAILED_PRECONDITION;
    return grpc.status.INTERNAL;
}


//  INVOICE HANDLERS
async function createInvoice(call, callback) {
    try {
        const invoice = await invoiceService.createInvoice(call.request);
        kafka.publishInvoiceCreated(invoice).catch(err =>
            console.error('[MS2][Kafka] Erreur invoice.created :', err.message)
        );
        callback(null, { invoice });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function updateInvoice(call, callback) {
    try {
        const invoice = await invoiceService.updateInvoice(call.request);
        callback(null, { invoice });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function deleteInvoice(call, callback) {
    try {
        const result = await invoiceService.deleteInvoice(call.request);
        callback(null, result);
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function signInvoice(call, callback) {
    try {
        const result  = await invoiceService.signInvoice(call.request);
        const invoice = await invoiceService.getInvoice({ id: call.request.invoice_id });
        kafka.publishInvoiceSigned({
            invoice_id:     invoice.id,
            client_id:      invoice.client_id,
            comptable_id:   call.request.comptable_id,
            numero:         invoice.numero,
            signature_hash: result.signature_hash,
        }).catch(err =>
            console.error('[MS2][Kafka] Erreur invoice.signed :', err.message)
        );
        callback(null, result);
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function getInvoice(call, callback) {
    try {
        const invoice = await invoiceService.getInvoice(call.request);
        callback(null, { invoice });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function getClientInvoices(call, callback) {
    try {
        const invoices = await invoiceService.getClientInvoices(call.request);
        callback(null, { invoices });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

async function getAllInvoices(call, callback) {
    try {
        const invoices = await invoiceService.getAllInvoices();
        callback(null, { invoices });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

//  DECLARATION HANDLERS
async function createDeclaration(call, callback) {
    try {
        const declaration = await declService.createDeclaration(call.request);
        kafka.publishDeclarationSubmitted(declaration).catch(err =>
            console.error('[MS2][Kafka] Erreur declaration.submitted :', err.message)
        );
        callback(null, { declaration });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function updateDeclaration(call, callback) {
    try {
        const declaration = await declService.updateDeclaration(call.request);
        callback(null, { declaration });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function deleteDeclaration(call, callback) {
    try {
        const result = await declService.deleteDeclaration(call.request);
        callback(null, result);
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function validateDeclaration(call, callback) {
    try {
        const declaration = await declService.validateDeclaration(call.request);
        kafka.publishDeclarationValidated(declaration).catch(err =>
            console.error('[MS2][Kafka] Erreur declaration.validated :', err.message)
        );
        callback(null, { declaration });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function getDeclaration(call, callback) {
    try {
        const declaration = await declService.getDeclaration(call.request);
        callback(null, { declaration });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function getClientDeclarations(call, callback) {
    try {
        const declarations = await declService.getClientDeclarations(call.request);
        callback(null, { declarations });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

async function getAllDeclarations(call, callback) {
    try {
        const declarations = await declService.getAllDeclarations();
        callback(null, { declarations });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

//  ALERTE HANDLERS

async function createAlerte(call, callback) {
    try {
        const alerte = await alerteService.createAlerte(call.request);
        kafka.publishAlerteCreated(alerte).catch(err =>
            console.error('[MS2][Kafka] Erreur alerte.created :', err.message)
        );
        callback(null, { alerte });
    } catch (err) {
        callback({ code: grpcError(err), message: err.message });
    }
}

async function getAlertes(call, callback) {
    try {
        const alertes = await alerteService.getAlertes(call.request);
        callback(null, { alertes });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

async function getAllAlertes(call, callback) {
    try {
        const alertes = await alerteService.getAllAlertes();
        callback(null, { alertes });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

module.exports = {
    // Invoice
    createInvoice, updateInvoice, deleteInvoice,
    signInvoice, getInvoice, getClientInvoices, getAllInvoices,
    // Declaration
    createDeclaration, updateDeclaration, deleteDeclaration,
    validateDeclaration, getDeclaration, getClientDeclarations, getAllDeclarations,
    // Alerte
    createAlerte, getAlertes, getAllAlertes,
};
