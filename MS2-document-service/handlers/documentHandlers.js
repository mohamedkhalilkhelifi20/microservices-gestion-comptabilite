'use strict';

const grpc= require('@grpc/grpc-js');
const invoiceService= require('../services/invoiceService');
const declService   = require('../services/declarationService');
const alerteService = require('../services/alerteService');
const kafka= require('../kafka/producer');

//  INVOICE HANDLERS

// CreateInvoice
async function createInvoice(call, callback) {
    try {
        const invoice = await invoiceService.createInvoice(call.request);
        kafka.publishInvoiceCreated(invoice).catch(err =>
            console.error('[MS2][Kafka] Erreur invoice.created :', err.message)
        );
        callback(null, { invoice });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// SignInvoice
async function signInvoice(call, callback) {
    try {
        const result = await invoiceService.signInvoice(call.request);

        // On a besoin de la facture pour enrichir l'event Kafka
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
        const notFound = err.message.includes('non trouvée');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetInvoice
async function getInvoice(call, callback) {
    try {
        const invoice = await invoiceService.getInvoice(call.request);
        callback(null, { invoice });
    } catch (err) {
        const notFound = err.message.includes('non trouvée');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetClientInvoices
async function getClientInvoices(call, callback) {
    try {
        const invoices = await invoiceService.getClientInvoices(call.request);
        callback(null, { invoices });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// GetAllInvoices
async function getAllInvoices(call, callback) {
    try {
        const invoices = await invoiceService.getAllInvoices();
        callback(null, { invoices });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

//  DECLARATION HANDLERS
// CreateDeclaration
async function createDeclaration(call, callback) {
    try {
        const declaration = await declService.createDeclaration(call.request);
        kafka.publishDeclarationSubmitted(declaration).catch(err =>
            console.error('[MS2][Kafka] Erreur declaration.submitted :', err.message)
        );
        callback(null, { declaration });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// ValidateDeclaration
async function validateDeclaration(call, callback) {
    try {
        const declaration = await declService.validateDeclaration(call.request);
        kafka.publishDeclarationValidated(declaration).catch(err =>
            console.error('[MS2][Kafka] Erreur declaration.validated :', err.message)
        );
        callback(null, { declaration });
    } catch (err) {
        const notFound = err.message.includes('non trouvée');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetDeclaration
async function getDeclaration(call, callback) {
    try {
        const declaration = await declService.getDeclaration(call.request);
        callback(null, { declaration });
    } catch (err) {
        const notFound = err.message.includes('non trouvée');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetClientDeclarations
async function getClientDeclarations(call, callback) {
    try {
        const declarations = await declService.getClientDeclarations(call.request);
        callback(null, { declarations });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// GetAllDeclarations
async function getAllDeclarations(call, callback) {
    try {
        const declarations = await declService.getAllDeclarations();
        callback(null, { declarations });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}


//  ALERTE HANDLERS
// CreateAlerte
async function createAlerte(call, callback) {
    try {
        const alerte = await alerteService.createAlerte(call.request);
        kafka.publishAlerteCreated(alerte).catch(err =>
            console.error('[MS2][Kafka] Erreur alerte.created :', err.message)
        );
        callback(null, { alerte });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// GetAlertes
async function getAlertes(call, callback) {
    try {
        const alertes = await alerteService.getAlertes(call.request);
        callback(null, { alertes });
    } catch (err) {
        callback({ code: grpc.status.INTERNAL, message: err.message });
    }
}

// GetAllAlertes
async function getAllAlertes(call, callback) {
    try {
        const alertes = await alerteService.getAllAlertes();
        callback(null, {alertes});
    } catch (err) {
        callback({code: grpc.status.INTERNAL, message: err.message});
    }

}

module.exports = {
    createInvoice, signInvoice, getInvoice, getClientInvoices, getAllInvoices,
    createDeclaration, validateDeclaration, getDeclaration,
    getClientDeclarations, getAllDeclarations,
    createAlerte, getAlertes, getAllAlertes,
};


