import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { NestFactory } from '@nestjs/core';
import { MachineTrackingService } from '../machine-tracking/machine-tracking.service';
import { AppModule } from '../app.module';

async function parseCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        results.push({
          orderId: data['Orders - OrderId → OrderId'],
          shipmentItemIdentifier: data.ShipmentItemIdentifier,
          shipmentStatus: data.ShipmentStatus,
          assignedSerialNumber: data.AssignedSerialNumber,
          userBID: data.UserBID,
          orderItemId: data['OrderItemId → Sku'],
          productId: data['ProductId → Sku'],
        });
      })
      .on('end', () => resolve(results))
      .on('error', (error) => reject(error));
  });
}

async function processRecords(records: any[], service: MachineTrackingService) {
  for (const record of records) {
    if (!record.orderId) {
      console.warn('Skipping record due to missing OrderId:', record);
      continue;
    }

    await service.updateMachineTracking({
      orderId: record.orderId,
      shipmentItemIdentifier: record.shipmentItemIdentifier,
      productId: record.productId,
      userBID: record.userBID,
      assignedSerialNumber: record.assignedSerialNumber,
      shipmentStatus: record.shipmentStatus,
      timestamp: record.trackingTimestamp,
      trackingId: record.trackingId,
      remark: record.remark,
    });
  }
}

async function bootstrap() {
  const csvFileName = 'order-info.csv';
  const csvFilePath = path.join(process.cwd(), csvFileName);

  if (!fs.existsSync(csvFilePath)) {
    console.error(`File not found: ${csvFilePath}`);
    process.exit(1);
  }

  try {
    console.log('Starting CSV processing...');
    const appContext = await NestFactory.createApplicationContext(AppModule);
    const machineTrackingService = appContext.get(MachineTrackingService);

    const records = await parseCSV(csvFilePath);
    console.log(`Parsed ${records.length} records from CSV.`);
    console.log({ records });
    await processRecords(records, machineTrackingService);
    console.log('CSV processing completed successfully.');
  } catch (error) {
    console.error('Error processing CSV:', error.message);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Error populating database:', err);
  process.exit(1);
});
