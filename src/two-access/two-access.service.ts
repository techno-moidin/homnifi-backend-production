import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, MongoClient } from 'typeorm';
import {
  FindPaginatedDto,
  FindByIdDto,
  FindByEmailDto,
  SearchDto,
  FindByStatusDto,
  FindByNameDto,
  FindByDateRangeDto,
  FindAllDto,
  FindActiveDto,
} from './dto/two-access.dto';
// MongoDB
import { UserRewards } from '../users/schemas/user-rewards';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class TwoAccessService {
  private readonly selectedColumns =
    'id, upline_id, email, username, first_name, last_name, membership_expiry, referral_code, is_active, date_joined, subscription_type, profile_picture As profilePicture , document_country';
  private readonly selectedColumnsCompatibleWithMongo =
    'id, id As blockchainId, upline_id as uplineId, email, username, first_name As firstName, last_name As lastName, membership_expiry, referral_code, is_active, date_joined, subscription_type, profile_picture As profilePicture, document_country';
  private readonly selectedModifyUserColumns =
    'id ,email, username, first_name ,last_name, date_joined, referral_code, membership_expiry, subscription_type, profile_picture As profilePicture, document_country';

  constructor(
    @InjectDataSource()
    private twoAccessDataSource: DataSource,
    @InjectDataSource('SECONDARY_PROGRESS')
    private secondaryProgressDataSource: DataSource,
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(UserRewards.name)
    private readonly userRewardsModel: Model<UserRewards>,
  ) {}

  // Get all authentication_user
  async findAllTwoAccessUsers(dto: FindAllDto) {
    return this.twoAccessDataSource.query(
      `SELECT ${this.selectedColumns} FROM authentication_user`,
    );
  }

  async findAllTwoAccessUsersV1(dto: FindAllDto) {
    return this.twoAccessDataSource.query(
      `SELECT ${this.selectedColumnsCompatibleWithMongo} FROM authentication_user`,
    );
  }

  async getUserByBid(bid: string) {
    return this.twoAccessDataSource.query(
      `SELECT * FROM authentication_user WHERE id = $1`,
      [bid],
    );
  }

  // Get user by id
  async findByIdTwoAccessUsers(id: string | number) {
    // console.log('*** findByIdTwoAccessUsers.id ***', id);
    // ${this.selectedColumns}

    return this.twoAccessDataSource.query(
      `SELECT au.id
      , au.upline_id
      , au.email
      , au.username
      , au.first_name
      , au.last_name
      , au.membership_expiry
      , au.referral_code
      , au.depth
      , au.is_active
      , au.date_joined
      , au.document_country
      , au.subscription_type
      , au.profile_picture AS profilePicture
      , au.document_country AS document_country
      , CASE 
          WHEN ( au.membership_expiry < CURRENT_DATE OR au.membership_expiry is null ) THEN 'false'  
          ELSE 'true' 
        END AS is_membership
      ,  (SELECT count(1) FROM authentication_user WHERE upline_id = au.id) AS firstLineNode
      FROM authentication_user au WHERE id = $1`,
      [id],
    );
  }

  async findByUplineIdTwoAccessUsers(upline_id: string | number) {
    // console.log('*** findByIdTwoAccessUsers.id ***', upline_id);

    return this.twoAccessDataSource.query(
      `SELECT ${this.selectedColumns}  
      , CASE 
          WHEN ( membership_expiry < CURRENT_DATE OR membership_expiry is null ) THEN 'false'  
          ELSE 'true' 
        END AS is_membership
      FROM authentication_user WHERE upline_id = $1`,
      [upline_id],
    );
  }

  async findByUplineIdTwoAccessUsersPaginated(
    bid: string,
    page: number,
    limit: number,
    query?: any,
    type?: any,
  ) {
    let condition1 = ''; // default condition
    let condition2 = ''; // default condition

    // Check validate date filter
    if (type && type.length > 0 && !['week', 'month', 'year'].includes(type)) {
      return {
        message: 'Invalid type, it must be week, month or year',
        status: false,
      };
    }

    if (query && query.length > 0) {
      // Escape all special characters in the query
      const escapedQuery = query.replace(/[%_\\']/g, '\\$&');
      condition1 = `AND (username LIKE '%${escapedQuery}%' ESCAPE '\\' OR email LIKE '%${escapedQuery}%' ESCAPE '\\' OR first_name LIKE '%${escapedQuery}%' ESCAPE '\\' OR last_name LIKE '%${escapedQuery}%' ESCAPE '\\' OR id LIKE '%${escapedQuery}%' ESCAPE '\\')`;
    }

    if (type && type.length > 0) {
      if (type === 'week') {
        condition2 = " AND date_joined >= CURRENT_DATE - INTERVAL '1 week'"; // Filter data for the last week
      } else if (type === 'month') {
        condition2 = " AND date_joined >= CURRENT_DATE - INTERVAL '1 month'"; // Filter data for the last month
      } else if (type === 'year') {
        condition2 = " AND date_joined >= CURRENT_DATE - INTERVAL '1 year'";
      }
    }
    const offset = (page - 1) * limit;

    // Count query to get the total number of records
    const countQuery = `
        SELECT COUNT(1) as total 
        FROM authentication_user 
        WHERE upline_id = $1
        ${condition1}
        ${condition2}
      `;

    const countResult = await this.twoAccessDataSource.query(countQuery, [bid]);
    const totalCount = parseInt(countResult[0].total, 10);

    var dataQuery = `
      SELECT ${this.selectedColumns}, 
        CASE 
          WHEN (membership_expiry < CURRENT_DATE OR membership_expiry is null) THEN 'false'  
          ELSE 'true' 
        END AS is_membership
      FROM authentication_user 
      WHERE upline_id = $1
      ${condition1}
      ${condition2}
      LIMIT ${limit} OFFSET ${offset};
    `;

    console.log('condition1', condition1);
    console.log('condition2', condition2);
    console.log('dataQuery', dataQuery);

    const users = await this.twoAccessDataSource.query(dataQuery, [bid]);

    // Calculate the total pages
    const totalPages = Math.ceil(totalCount / limit);

    return {
      users,
      page,
      limit,
      totalPages: totalPages,
      totalCount: totalCount,
    };
  }

  async findFistLineActiveUsers(bid: string) {
    // Query to get all active first line users
    const query = `
    SELECT ${this.selectedColumns}
    FROM authentication_user 
    WHERE upline_id = $1 
    AND membership_expiry >= CURRENT_DATE
  `;
    const result = await this.twoAccessDataSource.query(query, [bid]);
    return result;
  }

  async findByUplineIdTwoAccessUsersV1(
    upline_id: string | number,
    queryParam?: string, // Optional filter parameter
  ) {
    // Step 1: Fetch Users from PostgreSQL
    var pgUsers = await this.twoAccessDataSource.query(
      `SELECT au.id, au.username, au.membership_expiry, au.email, au.depth, au.date_joined AS "dateJoined", au.upline_id AS "uplineBID", referral_code as "referralCode", profile_picture AS "profilePicture", document_country, 
      CASE
        WHEN (au.membership_expiry < CURRENT_DATE OR membership_expiry IS NULL) THEN 'false'
        ELSE 'true'
      END AS "isMembership",
      (SELECT count(1) FROM authentication_user WHERE upline_id = au.id) AS "firstLineNode"
    FROM authentication_user au 
    WHERE au.upline_id = $1 `, // and au.id = '0224568777'  >> au.id is just for debugging purposes
      [upline_id],
    );

    if (!pgUsers.length) return [];

    // Step 2: Extract blockchain IDs
    const blockchainIds = pgUsers.map((user) => user.id).filter(Boolean);
    // console.log('blockchainIds', blockchainIds);
    // Step 3: Fetch Additional Data from MongoDB
    const now = new Date();

    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
    );
    const yesterdayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
    );

    let mongoData = [];
    if (blockchainIds.length) {
      mongoData = await this.userModel
        .find({
          blockchainId: {
            $in: blockchainIds.map((id) => id.toString().trim()),
          },
        })
        .select(
          '_id username firstName lastName blockchainId uplineId firstLineNode totalNode isBaseReferralActive isBuilderGenerationActive dateJoined depth',
        )
        .populate({
          path: 'uplineId', // Field to populate
          select:
            ' _id username firstName lastName blockchainId uplineId firstLineNode totalNode isBaseReferralActive isBuilderGenerationActive dateJoined depth', // Specify the fields to fetch from `uplineId`
        }) // Project required fields
        .lean(); // Use lean() for better performance

      // Step 3: Apply filtering if queryParam is provided
      if (queryParam) {
        const lowerQuery = queryParam.toLowerCase();
        pgUsers = pgUsers.filter(
          (user) =>
            user.username?.toLowerCase().includes(lowerQuery) ||
            user.email?.toLowerCase().includes(lowerQuery),
        );

        mongoData = mongoData.filter(
          (user) =>
            user.username?.toLowerCase().includes(lowerQuery) ||
            user.email?.toLowerCase().includes(lowerQuery) ||
            user.firstName?.toLowerCase().includes(lowerQuery) ||
            user.lastName?.toLowerCase().includes(lowerQuery),
        );
      }

      // Step 4: Fetch user rewards
      const childIds = mongoData.map((child) => child._id.toString());
      const userReward = await this.userRewardsModel
        .find({
          user: { $in: childIds.map((id) => new Types.ObjectId(id)) },
          createdAt: {
            $gte: new Date(yesterdayStart),
            $lt: new Date(yesterdayEnd),
          },
        })
        .select('_id myProduction user')
        .lean();

      const rewardsMap = userReward.reduce((acc, reward) => {
        acc[reward.user.toString()] = reward;
        return acc;
      }, {});

      // Step 5: Merge Postgres and MongoDB data with users
      interface PgUser {
        id: string;
        username: string;
        membership_expiry: string | null;
        isMembership: boolean;
        email: string;
        depth: string;
        referralCode: string;
        profilePicture: string;
        totalNodes: number;
        firstLineNode?: string;
        dateJoined?: string;
      }

      // Step 5.1 Fetch totalNodes for each user and update pgUsers list
      const pgUsersWithTotalNodes = await Promise.all(
        pgUsers.map(async (user) => {
          const totalNodesResult = await this.getUserTotalNodesById(user.id);
          return {
            ...user,
            totalNodes: totalNodesResult.totalNodes || 0,
          };
        }),
      );
      // Create a Map for quick lookup
      const pgUserMap = new Map<string, PgUser>(
        pgUsersWithTotalNodes.map((user) => [user.id.toString().trim(), user]),
      );

      const mergedChildren = mongoData.map((child) => {
        const pgUser = pgUserMap.get(child.blockchainId.toString().trim());
        return {
          ...child,
          email: pgUser?.email,
          depth: pgUser?.depth || 0,
          myProduction: rewardsMap[child._id.toString()]?.myProduction || 0,
          username: pgUser?.username || child.username,
          membership_expiry: pgUser?.membership_expiry,
          isMembership: pgUser
            ? new Date(pgUser.membership_expiry) >= new Date()
            : false,
          totalNode: pgUser?.totalNodes || 0, // Include totalNodes
          firstLineNode: pgUser?.firstLineNode
            ? Number(pgUser.firstLineNode)
            : 0, // Convert to number
          dateJoined: pgUser?.dateJoined ? pgUser.dateJoined : null, // Convert
          referralCode: pgUser?.referralCode ? pgUser.referralCode : null, // Convert
          profilePicture: pgUser?.profilePicture ? pgUser.profilePicture : null, // Convert
        };
      });
      // console.log('mergedChildren', mergedChildren);
      return [...mergedChildren];
    }
  }

  fetchChildrenV1 = async (
    ids: string[],
    depth = 1,
    maxDepth = 1,
  ): Promise<any[]> => {
    if (depth > maxDepth || ids.length === 0) {
      return [];
    }

    // const cacheKey = `userWithChildren:${userId}:page:${page}:limit:${limit}`;
    // console.log(`Cache Key: ${cacheKey}`);
    // const depth = 0;
    const now = new Date();
    const yesterdayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      0,
      0,
      0,
    );
    const yesterdayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
      23,
      59,
      59,
    );

    const children = await this.userModel
      .find({
        uplineId: { $in: ids.map((id) => new Types.ObjectId(id)) }, // Convert all IDs to ObjectId
      })
      .select(
        '_id username depth uplineId username email profilePicture blockchainId dateJoined firstLineNode isBaseReferralActive  isBuilderGenerationActive totalNode uplineBID totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership ',
      )
      .populate({
        path: 'uplineId', // Field to populate
        select:
          ' _id username firstName lastName depth uplineId uplineBID email datejoined isBaseReferralActive isBuilderGenerationActive firstLineNode totalNode profilePicture builderRefferalBonusEligibility isSupernodeActive  totalUserwithMachine totalUserwithMembership totalUserwithoutMachine totalUserwithoutMembership', // Specify the fields to fetch from `uplineId`
      })
      .lean();
    const childIds = children.map((child) => child._id.toString());

    const userReward: any = await this.userRewardsModel
      .find({
        user: { $in: childIds.map((id) => new Types.ObjectId(id)) }, // Convert all IDs to ObjectId
        createdAt: {
          $gte: new Date(yesterdayStart),
          $lt: new Date(yesterdayEnd),
        },
      })
      .select('_id myProduction user ')
      .lean();
    // console.log('## userReward ##', userReward);

    const rewardsMap = userReward.reduce((acc, reward) => {
      acc[reward.user.toString()] = reward;
      return acc;
    }, {});
    // Merge user rewards with children
    const mergedChildren = children.map((child) => {
      const reward = rewardsMap[child._id.toString()];
      // console.log('** Total reward **', reward.length);
      return {
        ...child,
        myProduction: reward ? reward.myProduction : 0, // Add rewards or default to 0 if no rewards found
      };
    });

    const deeperChildren = await this.fetchChildrenV1(
      childIds,
      depth + 1,
      maxDepth,
    );
    // console.log('deeperChildren :', deeperChildren);

    return [...mergedChildren, ...deeperChildren];
  };

  // Get user by email
  async findByEmailTwoAccessUsers(dto: FindByEmailDto) {
    return this.twoAccessDataSource.query(
      `SELECT ${this.selectedColumns} FROM authentication_user WHERE email = $1`,
      [dto.email],
    );
  }

  async getTotalTwoAccessUser() {
    const result = await this.twoAccessDataSource.query(
      `SELECT COUNT(1) AS count FROM authentication_user`,
    );
    return result[0]?.count || 0; // Ensure it returns a valid number
  }

  // Get authentication_user with pagination
  async findWithPaginationTwoAccessUsers(dto: FindPaginatedDto) {
    const offset = (dto.page - 1) * dto.limit;
    const [data, countResult] = await Promise.all([
      this.twoAccessDataSource.query(
        `SELECT ${this.selectedColumns} FROM authentication_user ORDER BY id DESC LIMIT $1 OFFSET $2`,
        [dto.limit, offset],
      ),
      this.twoAccessDataSource.query(
        'SELECT COUNT(*) FROM authentication_user',
      ),
    ]);

    const total = parseInt(countResult[0].count);

    return {
      list: data || [],
      totalCount: total,
      totalPages: Math.ceil(total / dto.limit),
      currentPage: dto.page,
    };
  }

  // Get users created within a date range
  async findByDateRangeTwoAccessUsers(dto: FindByDateRangeDto) {
    return this.twoAccessDataSource.query(
      `SELECT ${this.selectedColumns} FROM authentication_user WHERE date_joined BETWEEN $1 AND $2`,
      [dto.startDate, dto.endDate],
    );
  }

  async searchTwoAccessUsers(searchTerm: string) {
    return this.twoAccessDataSource.query(
      `
      SELECT ${this.selectedColumns} FROM authentication_user 
      WHERE id ILIKE $1 
      OR upline_id ILIKE $1 
      OR email ILIKE $1 
      OR username ILIKE $1 
      OR first_name ILIKE $1 
      OR last_name ILIKE $1 
      OR referral_code ILIKE $1 
      OR subscription_type ILIKE $1
      `,
      [`%${searchTerm}%`],
    );
  }

  // Get users hierarchy
  async getUserHierarchy(limit: number, offset: number, bids?: string[]) {
    let inCondition = '';
    if (bids && bids.length > 0) {
      const formattedIds = bids.map((id) => `'${id}'`).join(', ');
      inCondition = `AND id IN (${formattedIds})`;
    }
    const query = `
            WITH RECURSIVE user_hierarchy AS (
              SELECT
                  id,
                  username,
				  email,
				  first_name, 
				  last_name,
				  --profile_picture,
				  date_joined,
              	  upline_id,
                  -- upline_id As membership_upline_id,
                  id::TEXT AS path,
                  NULL::TEXT AS membership_path,  -- Start membership_path with the user's ID
                  0 AS depth_level,
                  membership_expiry,
                  CASE
                      WHEN membership_expiry IS NULL THEN 'false'
                      WHEN membership_expiry < CURRENT_DATE THEN 'Expired'
                      ELSE 'true'
                  END AS is_membership,
                  NULL::TEXT AS is_membership_upline,
                  NULL::TEXT AS username_upline,
                  depth
              FROM authentication_user
              WHERE upline_id IS NULL
              UNION ALL
              SELECT
                  au.id,
                  au.username,
				  au.email,
				  au.first_name, 
				  au.last_name,
				  --au.profile_picture,
				  au.date_joined,
                  -- Extract the LAST value from membership_path for upline_id
                  -- split_part(uh.membership_path, '/', array_length(string_to_array(uh.membership_path, '/'), 1)) AS upline_id,
              au.upline_id,
                  CONCAT(uh.path, '/', au.id) AS path,
              -- Exclude the current record's ID from membership_path
                  CASE
                      WHEN uh.membership_expiry IS NOT NULL
                      THEN COALESCE(uh.membership_path, '') ||
                          CASE WHEN uh.membership_path IS NOT NULL THEN '/' ELSE '' END || uh.id
                      ELSE uh.membership_path
                  END AS membership_path,
                  uh.depth_level + 1 AS depth_level,
                  au.membership_expiry,
                  CASE
                      WHEN au.membership_expiry IS NULL THEN 'false'
                      WHEN au.membership_expiry < CURRENT_DATE THEN 'expired'
                      ELSE 'true'
                  END AS is_membership,
                  (
                      SELECT
                          CASE
                              WHEN upusr2.membership_expiry IS NULL THEN 'false'
                              WHEN upusr2.membership_expiry < CURRENT_DATE THEN 'expired'
                              ELSE 'true'
                          END
                      FROM public.authentication_user upusr2
                      WHERE upusr2.id::TEXT = split_part(uh.membership_path, '/', array_length(string_to_array(uh.membership_path, '/'), 1))
                  ) AS is_membership_upline,
                  (
                      SELECT upusr.username
                      FROM public.authentication_user upusr
                      WHERE upusr.id::TEXT = split_part(uh.membership_path, '/', array_length(string_to_array(uh.membership_path, '/'), 1))
                  ) AS username_upline,
                  au.depth
              FROM authentication_user au
              JOIN user_hierarchy uh ON au.upline_id = uh.id
          )
          SELECT
              id,
            username,
			email,
			first_name, 
		    last_name,
		    --profile_picture,
		    date_joined,
            -- Extract the LAST value from membership_path for upline_id
            upline_id,
            split_part(membership_path, '/', array_length(string_to_array(membership_path, '/'), 1)) AS membership_upline_id,
              path,
              membership_path,
            depth_level,
              membership_expiry,
            is_membership,
                (
                      SELECT username
                      FROM public.authentication_user upusr
                      WHERE upusr.id::TEXT = split_part(membership_path, '/', array_length(string_to_array(membership_path, '/'), 1))
                  ) AS username_upline,
              (
                      SELECT membership_expiry::TIMESTAMPTZ
                      FROM public.authentication_user upusr
                      WHERE upusr.id::TEXT = split_part(membership_path, '/', array_length(string_to_array(membership_path, '/'), 1))
                  ) AS membership_expiry_upline ,
              -- Compute is_membership_upline outside the CTE
                (
                    SELECT
                        CASE
                            WHEN upusr.membership_expiry IS NULL THEN 'false'
                            WHEN upusr.membership_expiry < CURRENT_DATE THEN 'expired'
                            ELSE 'true'
                        END
                    FROM public.authentication_user upusr
                    WHERE upusr.id::TEXT = split_part(membership_path, '/', array_length(string_to_array(membership_path, '/'), 1))
                ) AS is_membership_upline
        FROM user_hierarchy
        WHERE 1=1
        ${inCondition}
        LIMIT ${limit} OFFSET ${offset};
      `;
    return this.twoAccessDataSource.query(query);
  }

  async getUserHierarchyByBid(bid?: any) {
    if (!bid) {
      return {
        message: 'bid is required',
        status: false,
      };
    }

    // const query = `
    //     WITH RECURSIVE user_hierarchy AS (
    //         SELECT
    //             id,
    //             username,
    //             upline_id,
    //             id::TEXT AS path,
    //             NULL::TEXT AS membership_path,
    //             0 AS depth_level,
    //             membership_expiry,
    //             CASE
    //                 WHEN membership_expiry IS NULL THEN 'false'
    //                 WHEN membership_expiry < CURRENT_DATE THEN 'expired'
    //                 ELSE 'true'
    //             END AS is_membership
    //         FROM authentication_user
    //         WHERE upline_id IS NULL
    //         UNION ALL
    //         SELECT
    //             au.id,
    //             au.username,
    //             au.upline_id,
    //             CONCAT(uh.path, '/', au.id) AS path,
    //             CASE
    //                 WHEN uh.membership_expiry IS NOT NULL
    //                 THEN COALESCE(uh.membership_path, '') ||
    //                     CASE WHEN uh.membership_path IS NOT NULL THEN '/' ELSE '' END || uh.id
    //                 ELSE uh.membership_path
    //             END AS membership_path,
    //             uh.depth_level + 1 AS depth_level,
    //             au.membership_expiry,
    //             CASE
    //                 WHEN au.membership_expiry IS NULL THEN 'false'
    //                 WHEN au.membership_expiry < CURRENT_DATE THEN 'expired'
    //                 ELSE 'true'
    //             END AS is_membership
    //         FROM authentication_user au
    //         JOIN user_hierarchy uh ON au.upline_id = uh.id
    //     )
    //     SELECT
    //         id,
    //         username,
    //         upline_id,
    //         path,
    //         membership_path,
    //         depth_level,
    //         membership_expiry,
    //         is_membership
    //     FROM user_hierarchy
    //     WHERE id = '${bid}'
    //     LIMIT 1;
    // `;

    const query = `SELECT * FROM user_tree
        WHERE 1=1
        AND id = '${bid}'
        LIMIT 1;`;

    const userHierarchy = await this.secondaryProgressDataSource.query(query);
    // const userHierarchy = await this.twoAccessDataSource.query(query);

    if (!userHierarchy.length) {
      return { message: 'User not found', status: false };
    }

    const userData = userHierarchy[0];

    // Extract membership path IDs
    const membershipPathIds = userData.membership_path
      ? userData.membership_path.split('/')
      : [];

    // Fetch members' details using extracted IDs
    if (membershipPathIds.length > 0) {
      const membersQuery = `
            SELECT id, username, membership_expiry, depth_level, upline_id
            , CASE
                    WHEN membership_expiry IS NULL THEN 'false'
                    WHEN membership_expiry < CURRENT_DATE THEN 'expired'
                    ELSE 'true'
                END AS is_membership
            , (
                SELECT count(1) 
                FROM user_tree
                WHERE upline_id = '${bid}'
                AND membership_expiry IS NOT NULL
              ) AS total_upline_is_membership    
            FROM user_tree
            WHERE id IN (${membershipPathIds.map((id) => `'${id}'`).join(', ')})
        `;

      const members =
        await this.secondaryProgressDataSource.query(membersQuery);
      userData.members = members;
    } else {
      userData.members = [];
    }

    return userData;
  }

  async getUserHierarchyPaginated(
    limit: number,
    offset: number,
    membership?: boolean,
  ) {
    let membershipCondition = '';
    if (membership !== undefined) {
      if (membership) {
        membershipCondition = 'AND membership_path IS NOT NULL';
      } else {
        membershipCondition = 'AND membership_path IS NULL';
      }
    }

    const query = `SELECT * FROM user_tree
        WHERE 1=1
        ${membershipCondition}
        AND is_membership = 'true'
        LIMIT ${limit} OFFSET ${offset};`;

    const userHierarchy = await this.secondaryProgressDataSource.query(query);

    // return;

    if (!userHierarchy.length) {
      return { message: 'User not found', status: false };
    }

    const userData = userHierarchy;
    for (const user of userData) {
      // Extract membership path IDs
      const membershipPathIds = user.membership_path
        ? user.membership_path.split('/')
        : [];

      // Fetch members' details using extracted IDs
      if (membershipPathIds.length > 0) {
        const membersQuery = `
            SELECT id, username, membership_expiry, depth_level, upline_id
            , CASE
                    WHEN membership_expiry IS NULL THEN 'false'
                    WHEN membership_expiry < CURRENT_DATE THEN 'expired'
                    ELSE 'true'
                END AS is_membership
            , (
                SELECT count(1) 
                FROM user_tree
                WHERE upline_id = user_tree.id
                AND membership_expiry IS NOT NULL
              ) AS total_upline_is_membership    
            FROM user_tree
            WHERE id IN (${membershipPathIds.map((id) => `'${id}'`).join(', ')})
        `;
        // console.log(membersQuery);

        const members =
          await this.secondaryProgressDataSource.query(membersQuery);
        user.members = members;
      } else {
        user.members = [];
      }
    }
    return userData;
  }

  // get user on the basis of the bid and their profile picture

  async findProfilePictureFromTwoAccessUsers(id: string | number) {
    const [data] = await Promise.all([
      this.twoAccessDataSource.query(
        `SELECT profile_picture FROM authentication_user WHERE id = $1`,
        [id],
      ),
    ]);
    return {
      profilePicture: data.length ? data[0].profile_picture : null,
    };
  }

  // Get users hierarchy
  // async findByUplineIdTwoAccessUsersPaginated
  //   (
  //   bid: string,
  //   page: number,
  //   limit: number,
  //   query?: any,
  //   type?: any,
  // ) {
  //   var condition1 = ''; // default condition
  //   var condition2 = ''; // default condition
  //   // Check validate date filter
  //   if (type && type.length > 0 && !['week', 'month', 'year'].includes(type)) {
  //     return {
  //       message: 'Invalid type, it must be week, month or year',
  //       status: false,
  //     };
  //   }
  //   if (query && query.length > 0) {
  //     condition1 = `AND (username LIKE '%${query}%' OR email LIKE '%${query}%' OR first_name LIKE '%${query}%' OR last_name LIKE '%${query}%' OR id LIKE '%${query}%')`;
  //   }
  //   if (type && type.length > 0) {
  //     if (type === 'week') {
  //       condition2 = " AND date_joined >= CURRENT_DATE - INTERVAL '1 week'"; // Filter data for the last week
  //     } else if (type === 'month') {
  //       condition2 = " AND date_joined >= CURRENT_DATE - INTERVAL '1 month'"; // Filter data for the last month
  //     } else if (type === 'year') {
  //       condition2 = " AND date_joined >= CURRENT_DATE - INTERVAL '1 year'"; // Filter data for the last year
  //     }
  //     // page = 1; // Reset page to 1
  //   }
  //   const offset = (page - 1) * limit;
  //   // Count query to get the total number of records
  //   const countQuery = `
  //       SELECT COUNT(1) as total
  //       FROM authentication_user
  //       WHERE upline_id = $1
  //       ${condition1}
  //       ${condition2}
  //     `;
  //   const countResult = await this.twoAccessDataSource.query(countQuery, [bid]);
  //   const totalCount = parseInt(countResult[0].total, 10);
  //   var dataQuery = `
  //     SELECT ${this.selectedColumns},
  //       CASE
  //         WHEN (membership_expiry < CURRENT_DATE OR membership_expiry is null) THEN 'false'
  //         ELSE 'true'
  //       END AS is_membership
  //     FROM authentication_user
  //     WHERE upline_id = $1
  //     ${condition1}
  //     ${condition2}
  //     LIMIT ${limit} OFFSET ${offset};
  //   `;

  //   const users = await this.twoAccessDataSource.query(dataQuery, [bid]);
  //   // Calculate the total pages
  //   const totalPages = Math.ceil(totalCount / limit);
  //   return {
  //     users,
  //     page,
  //     limit,
  //     totalPages: totalPages,
  //     totalCount: totalCount,
  //   };
  // }

  async getUserBasedOnId(id: string) {
    const [data] = await Promise.all([
      this.twoAccessDataSource.query(
        ` SELECT ${this.selectedModifyUserColumns}
          , (
                SELECT count(1) 
                FROM authentication_user
                WHERE upline_id = '${id}'
              ) AS total_first_line_node 
          FROM authentication_user 
          WHERE id = $1`,
        [id],
      ),
    ]);
    return {
      list: data || [],
    };
  }

  async getUserTotalNodesById(uplineId: string) {
    const getTotalNodesQuery = `
            WITH RECURSIVE user_hierarchy AS (
                -- Base Case: Start with the given upline_id
                SELECT id, username, email, upline_id
                FROM authentication_user
                WHERE upline_id = $1  -- Replace with the root user ID

                UNION ALL

                -- Recursive Case: Find users who have the current user as their upline
                SELECT au.id, au.username, au.email, au.upline_id
                FROM authentication_user au
                INNER JOIN user_hierarchy uh ON au.upline_id = uh.id
            )
            SELECT COUNT(1) AS total_nodes
            FROM user_hierarchy; `;
    const queryResult = await this.twoAccessDataSource.query(
      getTotalNodesQuery,
      [uplineId],
    );

    return {
      totalNodes: queryResult[0].total_nodes,
    };
  }
}
