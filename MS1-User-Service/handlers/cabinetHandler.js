'use strict';

const grpc    = require('@grpc/grpc-js');
const service = require('../services/cabinetService');

// CreateCabinet
async function createCabinet(call, callback) {
    try {
        const cabinet = await service.createCabinet(call.request);
        callback(null, { cabinet });
    } catch (err) {
        callback({
            code:    grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetCabinet
async function getCabinet(call, callback) {
    try {
        const cabinet = await service.getCabinet(call.request);
        callback(null, { cabinet });
    } catch (err) {
        const notFound = err.message.includes('non trouvé');
        callback({
            code:    notFound ? grpc.status.NOT_FOUND : grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

// GetAllCabinets
async function getAllCabinets(call, callback) {
    try {
        const cabinets = await service.getAllCabinets();
        callback(null, { cabinets });
    } catch (err) {
        callback({
            code:    grpc.status.INTERNAL,
            message: err.message,
        });
    }
}

module.exports = { createCabinet, getCabinet, getAllCabinets };


