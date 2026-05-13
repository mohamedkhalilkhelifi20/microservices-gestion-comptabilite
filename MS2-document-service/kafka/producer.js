'use strict';

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'ms2-document-service',
    brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let connected  = false;

async function connect() {
    if (!connected) {
        await producer.connect();
        connected = true;
        console.log('[MS2][Kafka] Producer connecté');
    }
}

async function disconnect() {
    if (connected) {
        await producer.disconnect();
        connected = false;
        console.log('[MS2][Kafka] Producer déconnecté');
    }
}

// ── invoice.created
// Déclenché : quand une nouvelle facture est créée (CreateInvoice)
async function publishInvoiceCreated(invoice) {
    await connect();
    await producer.send({
        topic:    'invoice.created',
        messages: [{
            key:   invoice.client_id,
            value: JSON.stringify({
                event:       'invoice.created',
                invoice_id:  invoice.id,
                client_id:   invoice.client_id,
                type:        invoice.type,
                montant_ttc: invoice.montant_ttc,
                statut:      invoice.statut,
                timestamp:   new Date().toISOString(),
            }),
        }],
    });
    console.log(`[MS2][Kafka] invoice.created publié → ${invoice.id}`);
}

// ── invoice.signed
// Déclenché : quand une facture est signée (SignInvoice)
// Consommateur : MS3 — crée notification + audit_log "SIGN"
async function publishInvoiceSigned({ invoice_id, client_id, comptable_id,
                                        numero, signature_hash }) {
    await connect();
    await producer.send({
        topic:    'invoice.signed',
        messages: [{
            key:   client_id,
            value: JSON.stringify({
                event:          'invoice.signed',
                invoice_id,
                client_id,
                comptable_id,
                numero,
                signature_hash,
                timestamp:      new Date().toISOString(),
            }),
        }],
    });
    console.log(`[MS2][Kafka] invoice.signed publié → ${invoice_id}`);
}

// ── invoice.paid
// Déclenché : quand une facture passe au statut "payee"
// Consommateur : MS3 — met à jour trésorerie dans dashboard
async function publishInvoicePaid({ invoice_id, client_id, montant_ttc }) {
    await connect();
    await producer.send({
        topic:    'invoice.paid',
        messages: [{
            key:   client_id,
            value: JSON.stringify({
                event:       'invoice.paid',
                invoice_id,
                client_id,
                montant_ttc,
                timestamp:   new Date().toISOString(),
            }),
        }],
    });
    console.log(`[MS2][Kafka] invoice.paid publié → ${invoice_id}`);
}

// ── declaration.submitted
// Déclenché : quand une déclaration est créée (CreateDeclaration)
// Consommateur : MS3 — met à jour tva_due dans dashboard
async function publishDeclarationSubmitted(declaration) {
    await connect();
    await producer.send({
        topic:    'declaration.submitted',
        messages: [{
            key:   declaration.client_id,
            value: JSON.stringify({
                event:          'declaration.submitted',
                declaration_id: declaration.id,
                client_id:      declaration.client_id,
                type:           declaration.type,
                periode:        declaration.periode,
                montant:        declaration.montant,
                timestamp:      new Date().toISOString(),
            }),
        }],
    });
    console.log(`[MS2][Kafka] declaration.submitted publié → ${declaration.id}`);
}

// ── declaration.validated
// Déclenché : quand une déclaration est validée (ValidateDeclaration)
// Consommateur : MS3 — crée notification + audit_log "VALIDATE"
async function publishDeclarationValidated(declaration) {
    await connect();
    await producer.send({
        topic:    'declaration.validated',
        messages: [{
            key:   declaration.client_id,
            value: JSON.stringify({
                event:          'declaration.validated',
                declaration_id: declaration.id,
                client_id:      declaration.client_id,
                type:           declaration.type,
                periode:        declaration.periode,
                validated_by:   declaration.validated_by,
                timestamp:      new Date().toISOString(),
            }),
        }],
    });
    console.log(`[MS2][Kafka] declaration.validated publié → ${declaration.id}`);
}

module.exports = {
    publishInvoiceCreated,
    publishInvoiceSigned,
    publishInvoicePaid,
    publishDeclarationSubmitted,
    publishDeclarationValidated,
    disconnect,
};
