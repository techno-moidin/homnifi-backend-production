import { platformVouchers } from '../jsonData/PlatformVoucher';
import mongoose from 'mongoose';
import { PlatformVoucherSchema } from '../platform-voucher/schemas/platform-voucher.schema';

async function populateData() {
  try {
    await mongoose.connect(
      process.env.MONGO_URI ||
        'mongodb://localhost:27017/homnifi-db-dump6?retryWrites=false',
    );

    const PlatformVoucherModel = mongoose.model(
      'PlatformVoucher',
      PlatformVoucherSchema,
    );

    await PlatformVoucherModel.deleteMany({});

    async function executeInBatches(promises, batchSize) {
      let results = [];
      for (let i = 0; i < promises.length; i += batchSize) {
        const batch = promises.slice(i, i + batchSize);
        ;
        const batchResults = await Promise.all(batch);
        results = results.concat(batchResults);
      }
      return results;
    }

    const voucherPromises = platformVouchers.flatMap((item) => {
      const { userBID, orderId, productId, validity, type, vouchers } = item;

      if (
        !userBID ||
        !orderId ||
        !productId ||
        !validity ||
        !type ||
        !vouchers ||
        !vouchers.length
      ) {
        return [];
      }

      const transformedValidity = transformValidity(validity);

      return vouchers.map(async (voucher) => {
        try {
          const newVoucher = new PlatformVoucherModel({
            userBID,
            orderId,
            productId,
            validity: transformedValidity,
            type,
            vouchers: voucher,
            title: `${type} ${transformedValidity}`,
            code: voucher,
          });

          ;

          await newVoucher.save();
          ;
        } catch (err) {
          console.error(`Failed to save voucher with code ${voucher}:`, err);
        }
      });
    });

    // Add a check to ensure `voucherPromises` is populated
    ;

    // Execute the voucher save operations in batches of 5
    await executeInBatches(voucherPromises, 100);

    ;
  } catch (error) {
    console.error('Error during data population:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }

  function transformValidity(validity: string): string {
    if (validity.toLowerCase() === 'yearly' || 'annually') return '365 days';
    if (validity.toLowerCase() === 'quarterly') return '90 days';
    return validity;
  }
}

populateData();
