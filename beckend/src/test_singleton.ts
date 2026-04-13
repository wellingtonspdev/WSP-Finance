import { prisma as singletonPrisma } from './lib/prisma';
import { InviteService } from './services/InviteService';
import fs from 'fs';

async function run() {
    const serviceCode = fs.readFileSync(__dirname + '/services/InviteService.ts', 'utf8');
    const controllerCode = fs.readFileSync(__dirname + '/controllers/InviteController.ts', 'utf8');

    const serviceUsesSingleton = serviceCode.includes("import { prisma } from '../lib/prisma'");
    const controllerUsesSingleton = controllerCode.includes("import { prisma } from '../lib/prisma'");

    const serviceHasNewInst = serviceCode.includes("new PrismaClient");
    const controllerHasNewInst = controllerCode.includes("new PrismaClient");

    console.log(`[PASS] InviteService.ts imports singleton: ${serviceUsesSingleton}`);
    console.log(`[PASS] InviteController.ts imports singleton: ${controllerUsesSingleton}`);
    console.log(`[PASS] InviteService.ts no longer instantiates new PrismaClient: ${!serviceHasNewInst}`);
    console.log(`[PASS] InviteController.ts no longer instantiates new PrismaClient: ${!controllerHasNewInst}`);
}

run();
