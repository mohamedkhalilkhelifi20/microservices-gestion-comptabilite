'use strict';

const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'ms1-user-service',
    brokers:  [process.env.KAFKA_BROKER || 'localhost:9092'],
});

const producer = kafka.producer();
let connected  = false;

async function connect() {
    if (!connected) {
        await producer.connect();
        connected = true;
        console.log('[MS1][Kafka] Producer connecté ✅');
    }
}

async function disconnect() {
    if (connected) {
        await producer.disconnect();
        connected = false;
        console.log('[MS1][Kafka] Producer déconnecté');
    }
}

// ── user.created
// Déclenché : quand un nouveau client est créé (CreateClient)
// Consommateur : MS3 — initialise le dashboard du client
async function publishUserCreated(client) {
    await connect();
    await producer.send({
        topic:    'user.created',
        messages: [{
            key:   client.id,
            value: JSON.stringify({
                event:      'user.created',
                client_id:  client.id,
                client_nom: client.nom,
                type:       client.type,
                cabinet_id: client.cabinet_id,
                timestamp:  new Date().toISOString(),
            }),
        }],
    });
    console.log(`[MS1][Kafka] user.created publié → client ${client.id}`);
}

// ── comptable.assigne
// Déclenché : quand un comptable est assigné à un client
// Consommateur : MS3 — log audit (qui gère qui)
async function publishComptableAssigned({ comptable_id, client_id, specialite }) {
    await connect();
    await producer.send({
        topic:    'comptable.assigned',
        messages: [{
            key:   client_id,
            value: JSON.stringify({
                event:        'comptable.assigned',
                comptable_id,
                client_id,
                specialite,
                timestamp:    new Date().toISOString(),
            }),
        }],
    });
    console.log(`[MS1][Kafka] comptable.assigned publié → ${comptable_id} ↔ ${client_id}`);
}

module.exports = { publishUserCreated, publishComptableAssigned, disconnect };
