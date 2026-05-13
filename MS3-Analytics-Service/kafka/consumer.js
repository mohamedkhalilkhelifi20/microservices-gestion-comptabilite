'use strict';

const { Kafka, logLevel } = require('kafkajs');

const { calculateAndSaveStats } = require('../services/statService');
const { createAlerte }          = require('../services/alerteService');
const { createAuditLog }        = require('../services/auditService');


//Kafka Client

const kafka = new Kafka({
    clientId: 'ms3-analytics-service',
    brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
    logLevel: logLevel.WARN,
});

const consumer = kafka.consumer({ groupId: 'ms3-analytics-group' });

const TOPICS = [
    'user.created',
    'comptable.assigned',
    'invoice.created',
    'declaration.submitted',
];

//Handlers par topic

async function handleUserCreated(payload) {
    const { id, cabinet_id } = payload;

    await createAuditLog({
        client_id:    id,
        action:       'create',
        entity_type:  'user',
        entity_id:    id,
        performed_by: 'system',
        details:      JSON.stringify({ cabinet_id }),
    });

    console.log(`[MS3][Consumer] user.created traité → user: ${id}`);
}

async function handleComptableAssigned(payload) {
    const { client_id, comptable_id } = payload;

    await createAuditLog({
        client_id,
        action:       'create',
        entity_type:  'assignation',
        entity_id:    comptable_id,
        performed_by: 'system',
        details:      JSON.stringify({ comptable_id }),
    });

    console.log(`[MS3][Consumer] comptable.assigned traité → client: ${client_id} | comptable: ${comptable_id}`);
}

async function handleInvoiceCreated(payload) {
    const { id, client_id, montant_ht, tva_montant, statut } = payload;

    // 1 — Mettre à jour les KPIs
    await calculateAndSaveStats({
        client_id,
        montant_ht:   Number(montant_ht)  || 0,
        tva_montant:  Number(tva_montant) || 0,
        type_event:   'invoice.created',
    });

    // 2 — Audit log
    await createAuditLog({
        client_id,
        action:       'create',
        entity_type:  'facture',
        entity_id:    id,
        performed_by: 'system',
        details:      JSON.stringify({ montant_ht, tva_montant, statut }),
    });

    // 3 — Alerte si facture impayée
    if (statut === 'impayee') {
        await createAlerte({
            client_id,
            type:        'impayee',
            message:     `Facture ${id} en attente de paiement`,
            severity:    'warning',
            entity_id:   id,
            entity_type: 'facture',
        });
    }

    console.log(`[MS3][Consumer] invoice.created traité → facture: ${id} | client: ${client_id}`);
}

async function handleDeclarationSubmitted(payload) {
    const { id, client_id, type, montant, periode } = payload;

    // 1 — Mettre à jour les KPIs
    await calculateAndSaveStats({
        client_id,
        montant_ht:  Number(montant) || 0,
        tva_montant: 0,
        type_event:  'declaration.submitted',
    });

    // 2 — Audit log
    await createAuditLog({
        client_id,
        action:       'submit',
        entity_type:  'declaration',
        entity_id:    id,
        performed_by: 'system',
        details:      JSON.stringify({ type, montant, periode }),
    });

    // 3 — Alerte échéance fiscale
    await createAlerte({
        client_id,
        type:        'echeance',
        message:     `Déclaration ${type} soumise pour la période ${periode}`,
        severity:    'info',
        entity_id:   id,
        entity_type: 'declaration',
    });

    console.log(`[MS3][Consumer] declaration.submitted traité → declaration: ${id} | client: ${client_id}`);
}

//Router principal

async function processMessage(topic, payload) {
    switch (topic) {
        case 'user.created':
            await handleUserCreated(payload);
            break;
        case 'comptable.assigned':
            await handleComptableAssigned(payload);
            break;
        case 'invoice.created':
            await handleInvoiceCreated(payload);
            break;
        case 'declaration.submitted':
            await handleDeclarationSubmitted(payload);
            break;
        default:
            console.warn(`[MS3][Consumer] Topic inconnu : ${topic}`);
    }
}

//Connect & Start

async function startConsumer() {
    await consumer.connect();
    console.log('[MS3][Consumer] Connecté à Kafka');

    await consumer.subscribe({ topics: TOPICS, fromBeginning: false });
    console.log(`[MS3][Consumer] Abonné aux topics : ${TOPICS.join(', ')}`);

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            try {
                const payload = JSON.parse(message.value.toString());
                console.log(`[MS3][Consumer] Message reçu → topic: ${topic} | partition: ${partition}`);
                await processMessage(topic, payload);
            } catch (err) {
                console.error(`[MS3][Consumer] Erreur traitement message → topic: ${topic} | error: ${err.message}`);
            }
        },
    });
}

async function disconnect() {
    await consumer.disconnect();
    console.log('[MS3][Consumer] Déconnecté de Kafka');
}

module.exports = { startConsumer, disconnect };
