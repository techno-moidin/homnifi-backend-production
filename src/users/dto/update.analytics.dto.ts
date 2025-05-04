export enum UpdateAnalyticsPointType {
  WITHMACHINE = 'totalUserwithMachine',
  WITHOUTMACHINE = 'totalUserwithoutMachine',
  WITHMEMBERSHIP = 'totalUserwithMembership',
  WITHOUTMEMBERSHIP = 'totalUserwithoutMembership',
  BUILDER_GENERATION = 'totalBuilderGenarational',
  BASE_REFERRAL = 'totalBaseReferral',
  TOTAL_NODE = 'totalNode',
  TOTAL_FIRSTLINE_NODE = 'firstLineNode',
}

export enum ActionAnalyticsPointType {
  INCREMENT = 'INCREMENT',
  DECREMENT = 'DECREMENT',
}

export enum ScenarioAnalyticsPointType {
  NEW_USER = 'NEW_USER',
  NEW_MACHINE = 'NEW_MACHINE',
  NEW_MEMBERSHIP = 'NEW_MEMBERSHIP',
  NEW_BUILDER_GENERATION = 'NEW_BUILDER_GENERATION',
  NEW_BASE_REFERRAL = 'NEW_BASE_REFERRAL',
}
export enum StatusAnalyticsPointType {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  PENDING = 'PENDING',
}

export const SCENARIO_TO_UPDATE_MAP: Record<
  ScenarioAnalyticsPointType,
  { updateFields: { [key in UpdateAnalyticsPointType]?: number } }
> = {
  [ScenarioAnalyticsPointType.NEW_USER]: {
    updateFields: {
      [UpdateAnalyticsPointType.TOTAL_NODE]: 1,
      [UpdateAnalyticsPointType.WITHOUTMACHINE]: 1,
      [UpdateAnalyticsPointType.WITHOUTMEMBERSHIP]: 1,
    },
  },
  [ScenarioAnalyticsPointType.NEW_MACHINE]: {
    updateFields: {
      [UpdateAnalyticsPointType.WITHMACHINE]: 1,
      [UpdateAnalyticsPointType.WITHOUTMACHINE]: -1,
    },
  },
  [ScenarioAnalyticsPointType.NEW_MEMBERSHIP]: {
    updateFields: {
      [UpdateAnalyticsPointType.WITHMEMBERSHIP]: 1,
      [UpdateAnalyticsPointType.WITHOUTMEMBERSHIP]: -1,
    },
  },
  [ScenarioAnalyticsPointType.NEW_BUILDER_GENERATION]: {
    updateFields: {
      [UpdateAnalyticsPointType.BUILDER_GENERATION]: 1,
    },
  },
  [ScenarioAnalyticsPointType.NEW_BASE_REFERRAL]: {
    updateFields: {
      [UpdateAnalyticsPointType.BASE_REFERRAL]: 1,
    },
  },
};
