import moment from 'moment';
import { DateRange } from './common.interface';
import { SN_BONUS_SUMMARY_TYPE_REPORT } from '@/src/supernode/enums/sn-bonus-type.enum';
import axios, { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { DueRemarks, DueType } from '@/src/wallet/enums/request.status.enum';
import { StaticToken } from '@/src/token/interfaces/token.interface';
import { WITHDRAW_TYPES } from '@/src/token/enums/withdraw-types.enum';
import { TrxType } from '@/src/global/enums/trx.type.enum';
import { AdditionalMintingPromotionStatus } from '@/src/admin/schemas/additional-minting-promotion.schema';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export async function groupByUpline(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.upline]) {
      acc[item.upline] = [];
    }
    acc[item.upline].push(item);
    return acc;
  }, {});
}

export async function groupByUser(data) {
  return data.reduce((acc, item) => {
    if (!acc[item.user]) {
      acc[item.user] = [];
    }
    acc[item.user].push(item);
    return acc;
  }, {});
}

/**
 * Get current day date range
 */
export async function getCurrentDay(): Promise<DateRange> {
  const currentDate = new Date();
  return {
    startDate: moment.utc(currentDate).startOf('day').toDate(),
    endDate: moment.utc(currentDate).endOf('day').toDate(),
  };
}

/**
 * Get previous day date range
 */
export async function getPreviousDay(): Promise<DateRange> {
  const currentDate = new Date();
  const previousDay = moment.utc(currentDate).subtract(1, 'day');
  return {
    startDate: previousDay.startOf('day').toDate(),
    endDate: previousDay.endOf('day').toDate(),
  };
}

/**
 * Get current week date range (Monday to Sunday)
 */
export async function getCurrentWeek(): Promise<DateRange> {
  const currentDate = new Date();
  return {
    startDate: moment.utc(currentDate).startOf('week').toDate(),
    endDate: moment.utc(currentDate).endOf('week').toDate(),
  };
}

/**
 * Get previous week date range
 */
export async function getPreviousWeek(): Promise<DateRange> {
  const currentDate = new Date();
  const previousWeek = moment.utc(currentDate).subtract(1, 'week');
  return {
    startDate: previousWeek.startOf('week').toDate(),
    endDate: previousWeek.endOf('week').toDate(),
  };
}

/**
 * Get current month date range
 */
export async function getCurrentMonth(): Promise<DateRange> {
  const currentDate = new Date();
  return {
    startDate: moment.utc(currentDate).startOf('month').toDate(),
    endDate: moment.utc(currentDate).endOf('month').toDate(),
  };
}

/**
 * Get previous month date range
 */
export async function getPreviousMonth(): Promise<DateRange> {
  const currentDate = new Date();
  const previousMonth = moment.utc(currentDate).subtract(1, 'month');
  return {
    startDate: previousMonth.startOf('month').toDate(),
    endDate: previousMonth.endOf('month').toDate(),
  };
}

/**
 * Get current quarter date range
 */
export async function getCurrentQuarter(): Promise<DateRange> {
  const currentDate = new Date();
  return {
    startDate: moment.utc(currentDate).startOf('quarter').toDate(),
    endDate: moment.utc(currentDate).endOf('quarter').toDate(),
  };
}

/**
 * Get previous quarter date range
 */
export async function getPreviousQuarter(): Promise<DateRange> {
  const currentDate = new Date();
  const previousQuarter = moment.utc(currentDate).subtract(1, 'quarter');
  return {
    startDate: previousQuarter.startOf('quarter').toDate(),
    endDate: previousQuarter.endOf('quarter').toDate(),
  };
}

/**
 * Get current year date range
 */
export async function getCurrentYear(): Promise<DateRange> {
  const currentDate = new Date();
  return {
    startDate: moment.utc(currentDate).startOf('year').toDate(),
    endDate: moment.utc(currentDate).endOf('year').toDate(),
  };
}

/**
 * Get previous year date range
 */
export async function getPreviousYear(): Promise<DateRange> {
  const currentDate = new Date();
  const previousYear = moment.utc(currentDate).subtract(1, 'year');
  return {
    startDate: previousYear.startOf('year').toDate(),
    endDate: previousYear.endOf('year').toDate(),
  };
}

/**
 * Get custom date range
 */
export async function getCustomRange(
  start: Date,
  end: Date,
): Promise<DateRange> {
  return {
    startDate: moment.utc(start).startOf('day').toDate(),
    endDate: moment.utc(end).endOf('day').toDate(),
  };
}

export async function getCustomRangeOfEndDate(end: Date): Promise<DateRange> {
  return {
    startDate: moment.utc(end).startOf('day').toDate(),
    endDate: moment.utc(end).endOf('day').toDate(),
  };
}

/**
 * Get last N days date range
 */
export async function getLastNDays(days: number): Promise<DateRange> {
  const currentDate = new Date();
  return {
    startDate: moment
      .utc(currentDate)
      .subtract(days, 'days')
      .startOf('day')
      .toDate(),
    endDate: moment.utc(currentDate).endOf('day').toDate(),
  };
}

export async function getTypeTitle(type: string): Promise<string> {
  switch (type) {
    case SN_BONUS_SUMMARY_TYPE_REPORT.BASE_REFERRAL:
      return 'Total Base Referral';
    case SN_BONUS_SUMMARY_TYPE_REPORT.BUILDER_GENERATIONAl:
      return 'Total Builder Generational';
    case SN_BONUS_SUMMARY_TYPE_REPORT.BUILDER_REFERRAL:
      return 'Total Builder Referral';
    case SN_BONUS_SUMMARY_TYPE_REPORT.MATCHING_BONUS:
      return 'Total Matching Bonus';

    default:
      return `Total ${type
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')}`;
  }
}
export async function getTokenCurrentPrice(
  pair: string,
): Promise<{ price: number; high: number }> {
  try {
    console.log(pair, 'Fetching price for pair');

    // const response: AxiosResponse<any> = await firstValueFrom(
    //   HttpService.get(
    //     `https://openapi.koinbay.com/sapi/v1/ticker?symbol=${pair}`,
    //   ),
    // );

    const response: AxiosResponse<any> = await axios.get(
      `https://openapi.koinbay.com/sapi/v1/ticker?symbol=${pair}`,
    );

    console.log(response.data, 'API Response Data');

    const data = {
      price: Number(response?.data?.last || response?.data?.sell || 0),
      high: Number(response?.data?.high || 0),
    };

    return data;
  } catch (error) {
    console.error('Error fetching token price:', error);

    const errorMessage =
      error?.response?.data?.message ||
      error?.message ||
      'Unknown error occurred';

    console.error('Extracted Error Message:', errorMessage);

    // Return default values instead of throwing if preferred
    throw new Error(errorMessage);
  }
}

export async function getConvertedUSDTTOLYK(): Promise<number> {
  const pair = process.env.LYK_PAIR_VALUE;

  try {
    const currentCoinSymbol = await getTokenCurrentPrice(pair);

    if (!currentCoinSymbol.price) {
      console.warn('Price not available for:', pair);
      return 0;
    }

    console.log(currentCoinSymbol, 'Current Coin Symbol Data');

    return currentCoinSymbol.price;
  } catch (error) {
    console.error('Error converting coin to USDT:', error);

    // Return a default value on failure
    return 0;
  }
}

// it will return the boolean value based on the string, email, number
export async function validateValue(value: any): Promise<boolean> {
  // Helper functions
  const isEmptyString = (str: string): boolean =>
    !str || str.trim().length === 0;
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check for null/undefined
  if (value === undefined || value === null) {
    return false;
  }

  // Check for number (including string numbers)
  if (typeof value === 'number' || !isNaN(Number(value))) {
    return true;
  }

  // Check for string types
  if (typeof value === 'string') {
    // Check for empty string
    if (isEmptyString(value)) {
      return false;
    }

    // Return true if it's either a valid email OR a non-empty string
    return isValidEmail(value) || value.trim().length > 0;
  }

  return false;
}

export async function getDateOrNull(inputDate: any): Promise<Date | null> {
  if (!inputDate) {
    return null; // Return null if or date is missing
  }

  const date = moment.utc(inputDate).endOf('day').toDate();
  return !isNaN(date.getTime()) ? date : null;
}

export async function getMembershipDetails(
  membership_expiry: string | null | undefined,
): Promise<{ membership_Date: Date | null; IsMembership: boolean }> {
  // If input is null, undefined, or empty string
  if (!membership_expiry) {
    return {
      membership_Date: null,
      IsMembership: false,
    };
  }

  // Handle various date formats
  let parsedDate: moment.Moment;

  try {
    // Try parsing the date with moment
    parsedDate = moment.utc(membership_expiry);

    // Check if the parsed date is valid
    if (!parsedDate.isValid()) {
      return {
        membership_Date: null,
        IsMembership: false,
      };
    }

    // Set the time to end of day
    const expiryDate = parsedDate.endOf('day').toDate();
    const today = moment.utc().endOf('day').toDate();

    return {
      membership_Date: expiryDate,
      IsMembership: expiryDate >= today,
    };
  } catch (error) {
    // If any error occurs during date parsing
    console.error('Error parsing membership date:', error);
    return {
      membership_Date: null,
      IsMembership: false,
    };
  }
}
export async function isMembershipValid(
  membershipExpiry: Date | string | number | null,
): Promise<boolean> {
  try {
    // Handle null/undefined cases
    if (!membershipExpiry) {
      return false;
    }

    // Convert to Date object if not already
    const expiryDate =
      membershipExpiry instanceof Date
        ? membershipExpiry
        : new Date(membershipExpiry);

    // Check if date is valid
    if (isNaN(expiryDate.getTime())) {
      return false;
    }

    // Get current date without time component for fair comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get expiry date without time component
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    // Compare dates
    return expiry >= today;
  } catch (error) {
    // Handle any unexpected errors
    console.error('Error validating membership:', error);
    return false;
  }
}

interface ITransactionDetails {
  type: DueType;
  amount: number;
  deductedAmount: number;
  actualTokenData: any;
  isAllowtoTransactions: boolean;
}
export async function generateDueTransactionDetails({
  type,
  amount,
  deductedAmount,
  actualTokenData,
  isAllowtoTransactions,
}: ITransactionDetails): Promise<{
  hash: string;
  userRemarks: string;
}> {
  try {
    // Generate user remarks based on transaction type
    let userRemarks: string = '';
    if (type === DueType.NODEK) {
      userRemarks = `NodeK claimable reward of amount ${amount} ${actualTokenData.name}, $${deductedAmount} deducted for ${StaticToken.DEBIT} wallet.`;
    } else if (type === DueType.SUPERNODE) {
      userRemarks = `Supernode claimable reward of amount ${amount} ${actualTokenData.name}, $${deductedAmount} deducted for ${StaticToken.DEBIT} wallet.`;
    } else {
      userRemarks = `Withdraw of amount ${amount} ${actualTokenData.name}, $${deductedAmount} deducted for ${StaticToken.DEBIT} wallet.`;
    }

    // Generate hash based on transaction type and conditions
    let hash: string = '';
    if (type === DueType.NODEK) {
      hash = `${
        isAllowtoTransactions
          ? DueRemarks.NodeK_CLAIMED_PARTIAL_DEBIT_WITHDRAW
          : DueRemarks.NodeK_CLAIMED_FULL_DEBIT_WITHDRAW
      }`;
    } else if (type === DueType.SUPERNODE) {
      hash = `${
        isAllowtoTransactions
          ? DueRemarks.SuperNode_CLAIMED_PARTIAL_DEBIT_WITHDRAW
          : DueRemarks.SuperNode_CLAIMED_FULL_DEBIT_WITHDRAW
      }`;
    } else {
      hash = `${
        isAllowtoTransactions
          ? DueRemarks.PARTIAL_DEBIT_WITHDRAW
          : DueRemarks.FULL_DEBIT_WITHDRAW
      }`;
    }

    return { hash, userRemarks };
  } catch (error) {
    throw new Error(`Error generating transaction details: ${error.message}`);
  }
}

export async function generateNoteTransactionDetails({
  fromBid,
  receiverAddress,
  trxType,
  fromAmount,
  amount,
  fee,
  commission,
  beforeWalletBalance,
  isDeducted,
  dueWalletBalance,
  deductedAmount,
  balanceAmount,
  actualTokenData,
  tokenPrice,
  hundredPercent,
  fromRequestedAmount,
  fromTokenId = null,
  toTokenId = null,
}: {
  fromBid: string | number;
  receiverAddress: string | number;
  trxType: TrxType;
  fromAmount: number;
  amount: number;
  fee: number;
  commission: number;
  beforeWalletBalance: number;
  isDeducted?: boolean;
  dueWalletBalance?: number;
  deductedAmount?: number;
  balanceAmount: number;
  actualTokenData: any;
  tokenPrice: number;
  hundredPercent?: boolean;
  fromRequestedAmount?: number;
  fromTokenId?: Types.ObjectId | null;
  toTokenId?: Types.ObjectId | null;
}): Promise<{ note: string; meta: Record<string, any>; userRemarks: string }> {
  try {
    const afterWalletBalance =
      trxType === TrxType.WITHDRAW
        ? beforeWalletBalance - balanceAmount
        : beforeWalletBalance + balanceAmount;

    // Simple note
    let userRemarks: string = ``;
    const note: string = `From Amount: ${fromAmount} - ${trxType} - Receivable Amount: ${balanceAmount} ${actualTokenData.name} - After Wallet Balance: ${afterWalletBalance} ${actualTokenData.name}`;

    // const formatToFixed5 = async (value) => {
    //   const num = Number(value);
    //   return isNaN(num)
    //     ? 0
    //     : Number(num.toFixed(num.toString().includes('.') ? 5 : undefined));
    // };
    const checkIsNan = async (value) => {
      const num = Number(value);
      return isNaN(num);
    };
    const formattedDeductedAmount = await formatToFixed5(deductedAmount);
    const formattedfromAmount = await formatToFixed5(fromAmount);
    const formattedbalanceAmount = await formatToFixed5(balanceAmount);

    if (actualTokenData.valueType == 'lyk') {
      let formattedfromAmountInDollar = 0;
      let formattedbalanceAmountInDollar = 0;

      const IsNanAmount = await checkIsNan(fromAmount);
      const IsNanbalanceAmount = await checkIsNan(balanceAmount);

      if (!IsNanAmount) {
        formattedfromAmountInDollar = tokenPrice * fromAmount;
        formattedfromAmountInDollar = await formatToFixed5(
          formattedfromAmountInDollar,
        );
      }
      if (!IsNanbalanceAmount) {
        formattedbalanceAmountInDollar = tokenPrice * balanceAmount;
        formattedbalanceAmountInDollar = await formatToFixed5(
          formattedbalanceAmountInDollar,
        );
      }

      if (isDeducted) {
        if (trxType === TrxType.CLAIMED_REWARD) {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Claim of $${formattedfromAmountInDollar} (${formattedfromAmount} ${actualTokenData.name}). Claim Processed: $${formattedbalanceAmountInDollar} (${formattedbalanceAmount} ${actualTokenData.name})`;
        } else if (trxType === TrxType.SUPERNODE_REWARD) {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Claim of $${formattedfromAmountInDollar} (${formattedfromAmount} ${actualTokenData.name}). Claim Processed: $${formattedbalanceAmountInDollar} (${formattedbalanceAmount} ${actualTokenData.name})`;
        } else {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Withdrawal request of $${formattedfromAmountInDollar} (${formattedfromAmount} ${actualTokenData.name}). Withdrawal Processed: $${formattedbalanceAmountInDollar} (${formattedbalanceAmount} ${actualTokenData.name})`;
        }
      } else {
        if (trxType === TrxType.CLAIMED_REWARD) {
          userRemarks = `$${formattedbalanceAmountInDollar} (${formattedbalanceAmount} ${actualTokenData.name}) Claim Processed Successfully`;
        } else if (trxType === TrxType.SUPERNODE_REWARD) {
          userRemarks = `$${formattedbalanceAmountInDollar} (${formattedbalanceAmount} ${actualTokenData.name}) Claim Processed Successfully`;
        } else if (trxType === TrxType.USDK_STAKE_REWARD) {
          userRemarks = `$${formattedbalanceAmountInDollar} (${formattedbalanceAmount} ${actualTokenData.name}) Claim Processed Successfully`;
        } else {
          userRemarks = `$${formattedbalanceAmountInDollar} (${formattedbalanceAmount} ${actualTokenData.name}) Withdrawal Processed Successfully`;
        }
      }
    } else if (actualTokenData.valueType == 'usd') {
      if (isDeducted) {
        if (trxType === TrxType.CLAIMED_REWARD) {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Claim of $${formattedfromAmount} ${actualTokenData.name}. Claim Processed: $${formattedbalanceAmount} ${actualTokenData.name}`;
        } else if (trxType === TrxType.SUPERNODE_REWARD) {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Claim of $${formattedfromAmount} ${actualTokenData.name}. Claim Processed: $${formattedbalanceAmount} ${actualTokenData.name}`;
        } else {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Withdrawal request of $${formattedfromAmount} ${actualTokenData.name}. Withdrawal Processed: $${formattedbalanceAmount} ${actualTokenData.name}`;
        }
      } else {
        if (trxType === TrxType.CLAIMED_REWARD) {
          userRemarks = `$${formattedbalanceAmount} ${actualTokenData.name} Claim Processed Successfully`;
        } else if (trxType === TrxType.SUPERNODE_REWARD) {
          userRemarks = `$${formattedbalanceAmount} ${actualTokenData.name} Claim Processed Successfully`;
        } else if (trxType === TrxType.USDK_STAKE_REWARD) {
          userRemarks = `$${formattedbalanceAmount} ${actualTokenData.name} Claim Processed Successfully`;
        } else {
          userRemarks = `$${formattedbalanceAmount} ${actualTokenData.name} Withdrawal Processed Successfully`;
        }
      }
    } else {
      if (isDeducted) {
        if (trxType === TrxType.CLAIMED_REWARD) {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Claim of ${formattedfromAmount} ${actualTokenData.name}. Claim Processed: ${formattedbalanceAmount} ${actualTokenData.name}`;
        } else if (trxType === TrxType.SUPERNODE_REWARD) {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Claim of ${formattedfromAmount} ${actualTokenData.name}. Claim Processed: ${formattedbalanceAmount} ${actualTokenData.name}`;
        } else {
          userRemarks = `Due Amount $${formattedDeductedAmount} deducted on Withdrawal request of ${formattedfromAmount} ${actualTokenData.name}. Withdrawal Processed: ${formattedbalanceAmount} ${actualTokenData.name}`;
        }
      } else {
        if (trxType === TrxType.CLAIMED_REWARD) {
          userRemarks = `${formattedbalanceAmount} ${actualTokenData.name} Claim Processed Successfully`;
        } else if (trxType === TrxType.SUPERNODE_REWARD) {
          userRemarks = `${formattedbalanceAmount} ${actualTokenData.name} Claim Processed Successfully`;
        } else if (trxType === TrxType.USDK_STAKE_REWARD) {
          userRemarks = `${formattedbalanceAmount} ${actualTokenData.name} Claim Processed Successfully`;
        } else {
          userRemarks = `${formattedbalanceAmount} ${actualTokenData.name} Withdrawal Processed Successfully`;
        }
      }
    }

    // Meta object with all key-value pairs
    const meta = {
      transactionType: trxType,
      fromBid,
      receiverAddress,
      fromAmount,
      amount,
      fee,
      commission,
      beforeWalletBalance,
      afterWalletBalance,
      isDeducted,
      dueWalletBalance,
      afterDueBalance: dueWalletBalance - deductedAmount,
      deductedAmount,
      balanceAmount,
      tokenName: actualTokenData.name,
      tokenPrice,
      hundredPercent: hundredPercent || false,
      fromRequestedAmount: fromRequestedAmount || null,
      fromTokenId,
      toTokenId,
    };

    return { note, meta, userRemarks };
  } catch (error) {
    throw new Error(`Error generating transaction details: ${error}`);
  }
}

export const generateDueTransactionRemark = async ({
  type,
  subType = null,
  requestedAmount = 0,
  dueAmount = 0,
  processedAmount = 0,
}: {
  type: DueType;
  subType?: WITHDRAW_TYPES;
  requestedAmount?: number;
  dueAmount?: number;
  processedAmount?: number;
}): Promise<{ remarks: string; isRemarkGenerated: boolean }> => {
  try {
    // Input validation
    if (!type) {
      return { isRemarkGenerated: false, remarks: '' };
    }

    // Format amounts to 2 decimal places
    const formatAmount = (amount) => {
      return parseFloat(amount).toFixed(5);
    };

    switch (type) {
      case DueType.WITHDRAW: {
        if (!subType) {
          return { isRemarkGenerated: false, remarks: '' };
        }
        if (!requestedAmount || !dueAmount || !processedAmount) {
          return { isRemarkGenerated: false, remarks: '' };
        }
        return {
          isRemarkGenerated: true,
          remarks: `Due Amount $${formatAmount(dueAmount)} deducted on ${subType} withdrawal request of $${formatAmount(requestedAmount)}. Withdrawal processed: $${formatAmount(processedAmount)}`,
        };
      }

      case DueType.NODEK: {
        if (!requestedAmount || !dueAmount || !processedAmount) {
          return { isRemarkGenerated: false, remarks: '' };
        }
        return {
          isRemarkGenerated: true,
          remarks: `Due Amount $${formatAmount(dueAmount)} deducted on nodek claim of $${formatAmount(requestedAmount)}. Claim processed: $${formatAmount(processedAmount)}`,
        };
      }
      case DueType.SUPERNODE: {
        if (!requestedAmount || !dueAmount || !processedAmount) {
          return { isRemarkGenerated: false, remarks: '' };
        }
        return {
          isRemarkGenerated: true,
          remarks: `Due Amount $${formatAmount(dueAmount)} deducted on supernode claim of $${formatAmount(requestedAmount)}. Claim processed: $${formatAmount(processedAmount)}`,
        };
      }
      default:
        return { isRemarkGenerated: false, remarks: '' };
    }
  } catch (error) {
    return { isRemarkGenerated: false, remarks: '' };
  }
};

export const formatToFixed5 = async (value) => {
  const num = Number(value);
  if (isNaN(num)) return 0;

  const parts = num.toString().split('.');
  if (parts.length === 1) return num; // No decimal part

  const decimalPart = parts[1].slice(0, 6); // Take up to 6 decimal places
  const result = `${parts[0]}.${decimalPart}`;

  return Number(result); // Convert back to remove unnecessary trailing zeros
};

// Ensure the value is padded with leading zeros to make it 10 digits long -  BID FIXER
export const padToTenDigits = (bid: number | string): string => {
  const strValue = bid.toString();
  return strValue.length < 10 ? strValue.padStart(10, '0') : strValue;
};

export const isPromotionExpired = (product, now = new Date()): boolean => {
  const startDate = product.startDatePromotion;
  const endDate = product.endDatePromotion;

  const isNotExpired: boolean =
    startDate &&
    endDate &&
    endDate >= now &&
    product.additionalMintingPowerStatus ===
      AdditionalMintingPromotionStatus.ACTIVE;

  return !isNotExpired;
};

export const normalizeDateRange = (
  startDate: string,
  endDate: string,
): { startDate: string; endDate: string } => {
  const extractDate = (dateStr: string) => {
    const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
    if (!match) throw new Error('Invalid date format');
    return match[1]; // Extract YYYY-MM-DD
  };

  const start = `${extractDate(startDate)}T00:00:00.000Z`;
  const end = `${extractDate(endDate)}T23:59:59.999Z`;

  return { startDate: start, endDate: end };
};

export const processDateInput = (input: string | Date): string => {
  try {
    // Convert input to a Date object if it's a string
    const dateObj = input instanceof Date ? input : new Date(input);

    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      throw new Error('Invalid date');
    }

    const formattedDate = dateObj.toISOString().split('T')[0];
    return formattedDate;
  } catch (error) {
    console.log(error);
  }
};

// Convert a number in scientific notation (E exponential) to a string with full decimal precision.
export const toFullDecimalString = (num) => {
  // Convert to string to handle scientific notation
  const str = num.toString();

  // If not in scientific notation, return as is
  if (!str.includes('e')) {
    // Limit the precision to 9 significant digits
    return parseFloat(num.toFixed(9)).toString();
  }

  // Split into coefficient and exponent
  const [coefficient, exponent] = str.split('e');
  const exp = parseInt(exponent, 10);

  // If positive exponent, just multiply by 10^exp
  if (exp >= 0) return (parseFloat(coefficient) * Math.pow(10, exp)).toFixed(9);

  // For negative exponent, create a decimal string with the right number of zeros
  const absExp = Math.abs(exp);
  const formatted =
    '0.' + '0'.repeat(absExp - 1) + coefficient.replace('.', '');

  // Return the formatted value with limited decimal precision
  return parseFloat(formatted).toFixed(9).toString();
};

// validate Any Basic Validation of Promotions
export function validatePromotionsDates(
  startDate: Date,
  endDate: Date,
): boolean {
  // Check if the startDate and endDate are valid
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Ensure startDate is today or in the future
  const startInputDate = start.toISOString().split('T')[0]; // Extract only the date part (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0]; // Extract current date
  const endInputDate = end.toISOString().split('T')[0]; // Extract current date

  const isStartDateValid = startInputDate >= today; // Accept today and future dates

  if (!isStartDateValid) {
    throw new BadRequestException('Start date must be today or in the future');
  }

  // Ensure the endDate is on the same day or after the startDate
  const isSameDay = startInputDate === endInputDate;
  const isEndDateValid = isSameDay || endInputDate > startInputDate;

  if (!isEndDateValid) {
    throw new BadRequestException(
      'End date must be the same day or after the start date',
    );
  }

  return isEndDateValid;
}

export function truncateNumber(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.trunc(num * factor) / factor;
}
