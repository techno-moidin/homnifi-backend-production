import { ValueType } from '@/src/token/schemas/token.schema';
import { ConversionMode } from '@/src/wallet/enums/conversion.status.enums';
import { getTokenCurrentPrice } from './common.functions';
import { AppModule } from '@/src/app.module';
import { WalletService } from '@/src/wallet/wallet.service';
import pLimit from 'p-limit';
import { NestFactory } from '@nestjs/core';
import { Types } from 'mongoose';

export async function getConversionMode(fromToken, toToken) {
  if (
    fromToken.conversionType.toLowerCase() === 'custom' &&
    toToken.conversionType.toLocaleLowerCase() === 'custom' &&
    fromToken.valueType.toLowerCase() === toToken.valueType.toLocaleLowerCase()
  ) {
    return ConversionMode.SAME;
  } else if (
    fromToken.conversionType.toLowerCase() === 'custom' &&
    toToken.conversionType.toLocaleLowerCase() === 'custom' &&
    fromToken.valueType.toLowerCase() !== toToken.valueType.toLocaleLowerCase()
  ) {
    return ConversionMode.TYPE_SAME_COIN_DIFFERENT;
  } else if (
    fromToken.conversionType.toLowerCase() === 'custom' &&
    toToken.conversionType.toLocaleLowerCase() === 'dynamic'
  ) {
    return ConversionMode.CUSTOM_TO_DYNAMIC;
  } else if (
    fromToken.conversionType.toLowerCase() === 'dynamic' &&
    toToken.conversionType.toLocaleLowerCase() === 'custom'
  ) {
    return ConversionMode.DYNAMIC_TO_CUSTOM;
  } else if (
    fromToken.conversionType.toLowerCase() === 'dynamic' &&
    toToken.conversionType.toLocaleLowerCase() === 'dynamic'
  ) {
    return ConversionMode.DYNAMIC_TO_DYNAMIC;
  }
}

export async function getActualAmountAfterConversion(
  fromToken,
  toToken,
  priceData,
  totalToken,
  conversionMode,
  customRate,
  isConvertable,
) {
  let totalAmount = totalToken;
  switch (conversionMode) {
    case ConversionMode.SAME:
      totalAmount = totalToken;
      break;
    case ConversionMode.TYPE_SAME_COIN_DIFFERENT: {
      const fromTokenCustomRate = fromToken.customRate;
      const toTokenCustomRate = toToken.customRate;
      const value = (totalToken * fromTokenCustomRate) / toTokenCustomRate;
      totalAmount = value;
      break;
    }

    case ConversionMode.CUSTOM_TO_DYNAMIC: {
      const fromTokenCustomRate = fromToken.customRate;
      const value = totalToken * fromTokenCustomRate;
      if (toToken.valueType === 'usd') {
        totalAmount = value;
      } else {
        const cPrice = await getTokenCurrentPrice(toToken.pairValue); // get value of 1 coin in usd
        totalAmount = value / cPrice.price;
      }
      break;
    }

    case ConversionMode.DYNAMIC_TO_CUSTOM: {
      const cPrice = await getTokenCurrentPrice(fromToken.pairValue); // get value of 1 coin in usd
      const convertValue = totalToken * cPrice.price;

      const toTokenCustomRate = toToken.customRate;
      totalAmount = convertValue / toTokenCustomRate;
      break;
    }

    case ConversionMode.DYNAMIC_TO_DYNAMIC: {
      if (!isConvertable) {
        if (
          fromToken.valueType.toLowerCase() ===
          toToken.valueType.toLocaleLowerCase()
        ) {
          // convert using coinbay/pbpay amount to usd
          totalAmount = totalToken; // Keep the amount the same
        } else if (
          fromToken.valueType === ValueType.USD &&
          toToken.valueType === ValueType.LYK
        ) {
          // From USD to LYK: multiply by LYK price
          totalAmount = totalToken / priceData.price;
        } else if (
          fromToken.valueType === ValueType.LYK &&
          toToken.valueType === ValueType.USD
        ) {
          totalAmount = totalToken * priceData.price;
        }
      } else {
        totalAmount = totalToken * customRate;
      }
      break;
    }
    default:
      break;
  }
  return totalAmount;
}
