'use strict';

const grpc    = require('@grpc/grpc-js');
const service = require('../services/comptableService');

// CreateComptable
async function createComptable(call, callback) {
    try {
        const comptable = await service.createComptable(call.request);
        callback(null, { comptable });
    } catch (err) {
        const notFound = err.message.includes('non trouvé');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetComptable

async function getComptable(call, callback) {
    try {
        const comptable = await service.getComptable(call.request);
        callback(null, { comptable });
    } catch (err) {
        const notFound = err.message.includes('non trouvé');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

//GetAllComptables
async function getAllComptables(call, callback) {
    try {
        const comptables = await service.getAllComptables();
        callback(null, { comptables });
    } catch (err) {
        callback({
            code:    grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

//GetComptablesBySpecialite
async function getComptablesBySpecialite(call, callback) {
    try {
        const comptables = await service.getComptablesBySpecialite(call.request);
        callback(null, { comptables });
    } catch (err) {
        callback({
            code:    grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

module.exports = {
    createComptable,
    getComptable,
    getAllComptables,
    getComptablesBySpecialite,
};
