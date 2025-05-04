import { Types } from 'mongoose';
import { ACTION, PERMISSION } from '../enums/permission';
import { DateFilter } from '../global/enums/date.filter.enum';
import { TrxType } from '../global/enums/trx.type.enum';
import { AmountType } from '../global/enums/amount.type.enum';
import { TIME_PERIOD } from './constants';

export const truncateDecimal = (value: number, decimal: number): number => {
  const factor = Math.pow(10, decimal); // 10^decimals
  return Math.trunc(value * factor) / factor;
};
export const setDecimalPlaces = (
  value: number,
  decimalPlacesType: AmountType,
) => {
  const decimalPlaces = decimalPlacesType === AmountType.DOLLAR ? 15 : 15;
  const factor = Math.pow(10, decimalPlaces);
  return (
    (value >= 0 ? Math.floor(value * factor) : Math.ceil(value * factor)) /
    factor
  );
};

function checkActionsExist(list: ACTION[], checkActions: ACTION[]) {
  if (list.includes(ACTION.ALL)) {
    return true;
  }
  if (checkActions.includes(ACTION.ALL)) {
    return true;
  }
  return checkActions.every((action) => list.includes(action));
}

export const checkExistence = (
  adminPermissions: PERMISSION[],
  checkItems: PERMISSION[],
) => {
  return checkItems.every((item) => {
    const hasModule = adminPermissions.find(
      (aPermission: PERMISSION) => aPermission.module === item.module,
    );

    if (hasModule) {
      const permissionActions = hasModule.action;
      const actionCheck = checkActionsExist(permissionActions, item.action);
      return actionCheck;
    }

    return hasModule;
  });
};

export const getFilterByTimePeriodConfigs = async (timePeriod: string) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const currentDay = currentDate.getDate();

  if (timePeriod === 'daily') {
    // Filter for the last 24 hours
    return { $gte: new Date(currentDate.getTime() - 24 * 60 * 60 * 1000) };
  } else if (timePeriod === 'weekly') {
    // Filter for the last 7 days
    return { $gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000) };
  } else if (timePeriod === 'monthly') {
    // Filter for the last 30 days
    const startOfMonth = new Date(
      currentDate.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    return { $gte: startOfMonth };
  } else if (timePeriod === 'yearly') {
    // Filter for the last 12 months
    const startOfYear = new Date(currentYear - 1, currentMonth, currentDay);
    return { $gte: startOfYear };
  }

  return null;
};

export function getDateRange(filter: DateFilter): {
  startDate: Date;
  endDate: Date;
} {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // Normalize to start of day in UTC

  let startDate = new Date(today);
  let endDate = new Date(today);
  endDate.setUTCHours(23, 59, 59, 999); // Ensure endDate is the end of the day

  switch (filter) {
    case DateFilter.TODAY:
      break;
    case DateFilter.YESTERDAY:
      startDate.setUTCDate(today.getUTCDate() - 1);
      endDate = new Date(startDate);
      endDate.setUTCHours(23, 59, 59, 999);
      break;
    case DateFilter.LAST_7_DAYS:
      startDate.setUTCDate(today.getUTCDate() - 6);
      break;
    case DateFilter.LAST_30_DAYS:
      startDate.setUTCDate(today.getUTCDate() - 29);
      break;
    case DateFilter.THIS_MONTH:
      startDate.setUTCDate(1);
      endDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
      );
      endDate.setUTCHours(23, 59, 59, 999);
      break;
    case DateFilter.LAST_MONTH:
      startDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
      );
      endDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0),
      );
      endDate.setUTCHours(23, 59, 59, 999);
      break;
    case DateFilter.THIS_YEAR:
      startDate = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
      endDate = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));
      endDate.setUTCHours(23, 59, 59, 999);
      break;
  }

  return { startDate, endDate };
}

export function getDateRangeFilter(period: TIME_PERIOD): any {
  let startOfPeriod: number, endOfPeriod: number;
  const currentDate = new Date();

  if (period === TIME_PERIOD.DAY) {
    startOfPeriod = currentDate.setHours(0, 0, 0, 0);
    endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  } else if (period === TIME_PERIOD.WEEK) {
    // Last 7 days
    startOfPeriod = currentDate.setDate(currentDate.getDate() - 7);
    endOfPeriod = new Date().setHours(23, 59, 59, 999);
  } else if (period === TIME_PERIOD.MONTH) {
    // Last 30 days
    startOfPeriod = currentDate.setDate(currentDate.getDate() - 30);
    endOfPeriod = new Date().setHours(23, 59, 59, 999);
  } else if (period === TIME_PERIOD.YEAR) {
    // Last 365 days
    startOfPeriod = currentDate.setDate(currentDate.getDate() - 365);
    endOfPeriod = new Date().setHours(23, 59, 59, 999);
  } else {
    startOfPeriod = currentDate.setHours(0, 0, 0, 0);
    endOfPeriod = currentDate.setHours(23, 59, 59, 999);
  }

  return { startOfPeriod, endOfPeriod };
}

export function generateUniqueString(trxType: TrxType, num: number): string {
  const prefix = trxType.charAt(0).toUpperCase();
  const incrementedNumber = num.toString();
  const randomPart = Math.random().toString(16).substr(2, 6); // Generate 6 random characters

  const uniqueString = `${prefix}0x${incrementedNumber}${randomPart}`;

  return uniqueString;
}

export const toObjectId = (id: string): Types.ObjectId => {
  return new Types.ObjectId(id);
};

export function calculateTimeDifference(start: Date, end: Date): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const timeDifference = endDate.getTime() - startDate.getTime(); // Difference in milliseconds

  // Convert the difference to hours, minutes, and seconds
  let diffInSeconds = Math.floor(timeDifference / 1000);
  const hours = Math.floor(diffInSeconds / 3600);
  diffInSeconds %= 3600;
  const minutes = Math.floor(diffInSeconds / 60);
  const seconds = diffInSeconds % 60;

  // Format the output to HH:MM:SS
  const formattedTime =
    String(hours).padStart(2, '0') +
    ':' +
    String(minutes).padStart(2, '0') +
    ':' +
    String(seconds).padStart(2, '0');

  return formattedTime;
}

export const transformToLowerCase = ({ value }) =>
  value.toLowerCase ? value.toLowerCase() : value;

export function clog(...data): void {
  const message = data[data.length - 1];
  data.splice(-1);
}

const getPaginationOffset = (page: any, pageSize: any) => {
  const limit: number = parseInt(pageSize);
  let pageNumber: number = parseInt(page);
  pageNumber === 0 ? (pageNumber = 1) : null;
  const offset: any = (pageNumber - 1) * limit;
  return { offset, limit, pageNumber };
};

const doPagingPreData = (total, limit, pageNumber) => {
  const totalPage = Math.ceil(total / limit);

  let hasNextPage = true;
  const nextPage = pageNumber + 1;
  let hasPreviousPage = false;
  const previousPage = pageNumber - 1;

  if (nextPage > totalPage) {
    hasNextPage = false;
  }

  if (pageNumber > 1) {
    hasPreviousPage = true;
  } else {
    hasPreviousPage = false;
  }

  const pageInfo = {
    totalPage,
    currentPage: pageNumber,
    nextPage: hasNextPage ? nextPage : null,
    previousPage: hasPreviousPage ? previousPage : null,
  };

  return {
    totalPage,
    hasNextPage,
    hasPreviousPage,
    pageInfo,
  };
};

const doPaging = async (currentPage, range, totalPages, start = 1) => {
  const paging = [];

  range > totalPages ? (range = totalPages) : null;

  if (currentPage < range / 2 + 1) {
    start = 1;
  } else if (currentPage >= totalPages - range / 2) {
    start = Math.floor(totalPages - range + 1);
  } else {
    start = currentPage - Math.floor(range / 2);
  }

  for (let i = start; i <= start + range - 1; i++) {
    if (i == currentPage) {
      // paging.push(`[${i}]`); // add brackets to indicate current page
      paging.push({
        active: true,
        page: i,
      });
    } else {
      // paging.push(i.toString());
      paging.push({
        active: false,
        page: i,
      });
    }
  }
  return paging.length > 1 ? paging : [];
};

export const pagination = async ({
  page,
  pageSize = 20,
  model,
  condition,
  pagingRange = 5,
}) => {
  const { offset, limit, pageNumber }: any = getPaginationOffset(
    page,
    pageSize,
  );

  const total = await model.countDocuments(condition);

  const { totalPage, hasNextPage, hasPreviousPage, pageInfo } = doPagingPreData(
    total,
    limit,
    pageNumber,
  );

  const paging = await doPaging(
    pageNumber,
    pagingRange,
    totalPage,
    pageNumber - 1 * limit,
  );

  return {
    limit,
    total,
    offset,
    metadata: {
      hasNextPage,
      hasPreviousPage,
      list: {
        total,
        limit,
      },
      page: pageInfo,
      paging,
    },
  };
};
