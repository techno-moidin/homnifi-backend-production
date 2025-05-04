import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import mongoose, { Model, Types } from 'mongoose';
import { Token } from '../../token/schemas/token.schema';
import { Wallet } from '../../wallet/schemas/wallet.schema';
import { WalletTransaction } from '../../wallet/schemas/wallet.transaction.schema.';
import { WithdrawTransaction } from '../../wallet/schemas/withdraw.transaction.schema';
import { DueRemarks } from '../../wallet/enums/request.status.enum';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { User } from '@/src/users/schemas/user.schema';
import { WalletService } from '@/src/wallet/wallet.service';
import { TrxType } from '@/src/global/enums/trx.type.enum';
import { DepositTransaction } from '@/src/wallet/schemas/deposit.transaction.schema';
import { DepositTransactionHistory } from '@/src/wallet/schemas/deposit.history.transaction.schema';
import { TransactionStatus } from '@/src/global/enums/transaction.status.enum';

function extractValue(userRemarks, searchText, endText = null) {
  try {
    // Escape special regex characters in search text
    const escapedSearchText = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build the regex pattern
    // Look for searchText followed by optional whitespace, then capture numbers (including decimals)
    let pattern = `${escapedSearchText}\\s*(\\d+(?:\\.\\d+)?)`;

    // If endText is provided, look for the value before that text
    if (endText) {
      const escapedEndText = endText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      pattern += `\\s*${escapedEndText}`;
    } else {
      // Otherwise, capture until the next pipe or end of string
      pattern += `(?:\\s*(?=\\|)|\\s*$)`;
    }

    const regex = new RegExp(pattern);
    const match = userRemarks.match(regex);

    return match ? parseFloat(match[1]) : null;
  } catch (error) {
    console.error('Error in extractValue:', error);
    return null;
  }
}

function isTextExists(fullText, searchText) {
  if (!fullText || !searchText) return false;
  return fullText.toLowerCase().includes(searchText.toLowerCase());
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: {
    id: string;
    reason: string;
  };
}

interface TokenDepositParams {
  userBlockchainId: string;
  token: Token;
  amount: number;
  dueToken: Token;
  dueAmount: number;
  userId: Types.ObjectId;
}

// Helper function to calculate token amount based on value type
export function calculateTokenAmount(
  baseAmount: number,
  token: Token,
  tokenPrice?: number,
): number {
  if (token.valueType === 'usd') {
    return baseAmount;
  }

  if (!tokenPrice) {
    throw new Error('Token price is required for non-USD tokens');
  }

  return baseAmount / tokenPrice;
}

async function bootstrap() {
  const appContext = await NestFactory.createApplicationContext(AppModule);
  const searchText = [
    {
      searchText: 'Amount:',
      endText: 'LYK-W',
      expected: 20,
    },
    {
      searchText: 'Debit Wallet Deductions: $',
      expected: 18.5781504,
    },
    {
      searchText: 'withdrawal of',
      endText: 'LYK-W',
      expected: 20,
    },
  ];

  try {
    const httpService = appContext.get(HttpService);
    const wallettransactions = appContext.get<Model<WalletTransaction>>(
      WalletTransaction.name + 'Model',
    );
    // Get model instances
    const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
    const walletModel = appContext.get<Model<Wallet>>(Wallet.name + 'Model');
    const UserModel = appContext.get<Model<User>>(User.name + 'Model');
    const walletService = appContext.get(WalletService);
    const deposittransactions = appContext.get<Model<DepositTransaction>>(
      DepositTransaction.name + 'Model',
    );

    const depositTransactionHistory = appContext.get<
      Model<DepositTransactionHistory>
    >(DepositTransactionHistory.name + 'Model');

    const walletTransactionModel = appContext.get<Model<WalletTransaction>>(
      WalletTransaction.name + 'Model',
    );
    const withdrawTransactionModel = appContext.get<Model<WithdrawTransaction>>(
      WithdrawTransaction.name + 'Model',
    );

    async function processTokenDeposits(
      httpService: HttpService,
      params: TokenDepositParams,
    ): Promise<[ApiResponse, ApiResponse]> {
      const { userBlockchainId, token, amount, dueToken, dueAmount, userId } =
        params;

      try {
        const user = await UserModel.findById(userId);
        if (!user) throw new Error('User not found');

        const processDeposit = async (token: Token, depositAmount: number) => {
          if (depositAmount <= 0) return null;

          const userWallet = await walletService.findUserWalletByTokenSymbol(
            token.symbol,
            userId,
          );
          const { walletBalance } = await walletService.getBalanceByWallet(
            userId,
            userWallet._id,
          );

          const walletTransaction = await wallettransactions.create({
            transactionFlow: 'in',
            note: 'Auto-generated wallet transaction during migration revert process',
            amount: depositAmount,
            trxType: TrxType.MIGRATE,
            wallet: userWallet._id,
            user: user._id,
          });

          const { requestId, serialNumber } =
            await walletService.generateUniqueRequestId(TrxType.DEPOSIT);

          const newDeposit = await deposittransactions.create({
            requestId,
            serialNumber,
            toWallet: userWallet._id,
            toWalletTrx: walletTransaction._id,
            user: user._id,
            transactionStatus: TransactionStatus.SUCCESS,
            amount: depositAmount,
            confirmation: 'By Script',
            remarks: `This transaction was automatically generated to correct the ${token.name} balance.`,
            note: 'HOM-2148 | deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue',
            previousBalance: walletBalance,
            newBalance: walletBalance + depositAmount,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const depositHistory = new depositTransactionHistory({
            requestId,
            serialNumber,
            fromToken: token._id,
            deposit_id: newDeposit._id,
            toWallet: userWallet._id,
            toWalletTrx: walletTransaction._id,
            transactionStatus: TransactionStatus.SUCCESS,
            user: user._id,
            amount: depositAmount,
            confirmation: 'By Script',
            remarks: `This transaction was automatically generated to correct the ${token.name} balance.`,
            note: 'HOM-2148 | deposit transaction history for record consistency | LYK-W to mLYK Migration | Wallek Issue',
            previousBalance: walletBalance,
            newBalance: walletBalance + depositAmount,
            createdAt: new Date(),
            updatedAt: new Date(),
            token: token._id,
            blockchainId: user.blockchainId,
          });
          await depositHistory.save();
          return depositHistory;
        };

        const mainDeposit = await processDeposit(token, amount);
        const dueDeposit = await processDeposit(dueToken, dueAmount);

        return [
          { success: true, data: mainDeposit },
          { success: true, data: dueDeposit },
        ];
      } catch (error) {
        const apiError = { id: userBlockchainId, reason: error.message };
        return [
          { success: false, error: apiError },
          { success: false, error: apiError },
        ];
      }
    }

    // Find the DUE token
    const dueToken = await tokenModel.findOne({
      symbol: 'due',
      deletedAt: null,
    });

    if (!dueToken) {
      console.error('DUE token not found');
      return;
    }
    console.log(
      `Analyzing transactions for DUE token (ID: ${dueToken._id} ${dueToken} )`,
    );

    const findUserListByDebitOut = await walletTransactionModel.aggregate([
      {
        $match: {
          user: new Types.ObjectId('670917cf1d934fb967b78f51'),
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'wallets',
          localField: 'wallet',
          foreignField: '_id',
          as: 'walletDetails',
        },
      },
      {
        $unwind: '$walletDetails',
      },

      {
        $match: {
          'walletDetails.token': dueToken._id,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      {
        $unwind: '$userDetails',
      },
      {
        $group: {
          _id: '$user',
          transactionFlows: {
            $addToSet: '$transactionFlow',
          },
          username: {
            $first: '$userDetails.username',
          },
        },
      },
      {
        $group: {
          _id: null,
          // debit_Wallet_Only_In_User_List: {
          //   $push: {
          //     $cond: [
          //       {
          //         $eq: ['$transactionFlows', ['in']],
          //       },
          //       {
          //         user: '$_id',
          //         username: '$username',
          //       },
          //       '$$REMOVE',
          //     ],
          //   },
          // },
          debit_Wallet_In_AND_Out_User_List: {
            $push: {
              $cond: [
                {
                  $and: [
                    {
                      $in: ['in', '$transactionFlows'],
                    },
                    {
                      $in: ['out', '$transactionFlows'],
                    },
                  ],
                },
                {
                  user: '$_id',
                  username: '$username',
                },
                '$$REMOVE',
              ],
            },
          },
        },
      },
    ]);

    console.log(findUserListByDebitOut, 'findUserListByDebitOut');
    for (
      let index = 0;
      index <
      findUserListByDebitOut[0].debit_Wallet_In_AND_Out_User_List.length;
      index++
    ) {
      const elementUser =
        findUserListByDebitOut[0].debit_Wallet_In_AND_Out_User_List[index];
      console.log(elementUser.username),
        '-----------USER CHECK---------------------';

      const getWithdrawTransactions = await withdrawTransactionModel.aggregate([
        {
          $match: {
            user: elementUser.user,
            createdAt: {
              $gte: new Date('2025-01-27T00:00:00.000Z'),
            },
          },
        },
        {
          $sort: {
            createdAt: 1,
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'userDetails',
          },
        },
        {
          $unwind: '$userDetails',
        },
        {
          $lookup: {
            from: 'wallets',
            localField: 'fromWallet',
            foreignField: '_id',
            as: 'walletDetails',
          },
        },
        {
          $unwind: '$walletDetails',
        },
        {
          $lookup: {
            from: 'wallettransactions',
            localField: 'fromWalletTrx',
            foreignField: '_id',
            as: 'trxDetails',
          },
        },
        {
          $unwind: '$trxDetails',
        },
        {
          $lookup: {
            from: 'tokens',
            localField: 'token',
            foreignField: '_id',
            as: 'tokenDetails',
          },
        },
        {
          $unwind: '$tokenDetails',
        },

        {
          $project: {
            fee: 1,
            withdrawType: 1,
            userRemarks: 1,
            blockchainId: 1,
            receiverAddress: 1,
            note: 1,
            commission: 1,
            tokenPrice: 1,
            amount: 1,
            token: 1,
            total: 1,
            tokenDetails: {
              name: 1,
              valueType: 1,
            },
            userDetails: {
              username: 1,
              email: 1,
              blockchainId: 1,
            },
            walletDetails: 1,
            trxDetails: {
              _id: 1,
              amount: 1,
              transactionFlow: 1,
            },
          },
        },
      ]);
      console.log(getWithdrawTransactions.length, 'getWithdrawTransactions');

      for (let index = 0; index < getWithdrawTransactions.length; index++) {
        const element = getWithdrawTransactions[index];

        if (
          element.blockchainId === element.receiverAddress &&
          element.userRemarks === 'Deducted from due wallet.'
        ) {
          const findNextTransaction = getWithdrawTransactions[index + 1];
          console.log(element.userDetails, 'element._id');

          if (
            findNextTransaction &&
            findNextTransaction.blockchainId !=
              findNextTransaction.receiverAddress &&
            findNextTransaction.amount != findNextTransaction.total
          ) {
            element.specialType = 'withdraw';
            // const amount = extractValue(userRemarks, 'Amount:', 'LYK-W');

            const findDebitTransaction = await extractValue(
              findNextTransaction.userRemarks,
              'Debit Wallet Deductions: $',
            );
            if (findDebitTransaction === element.amount) {
              element.specialType = `Perfect Connection for full debited ${findNextTransaction._id} `;
              const advanceValidation = await isTextExists(
                findNextTransaction.note,
                'Amount is deducted from due wallet.',
              );
              if (advanceValidation) {
                element.specialType =
                  element.specialType + `and Andvance Check Passed`;
                let amount: number = 0;
                // Second processing stage (API calls)

                const findFromToken = await tokenModel.findById(
                  findNextTransaction.token,
                );
                if (findFromToken?.valueType === 'usd') {
                  amount = element.amount;
                  if (
                    amount ===
                    findNextTransaction.total - findNextTransaction.amount
                  ) {
                    const params: TokenDepositParams = {
                      userBlockchainId: element.userDetails.blockchainId,
                      token: findFromToken,
                      amount: element.amount,
                      dueToken: dueToken,
                      dueAmount: element.amount,
                      userId: elementUser.user,
                    };

                    const [tokenResult, dueResult] = await processTokenDeposits(
                      httpService,
                      params,
                    );

                    if (tokenResult.success && dueResult.success) {
                      console.log('Both deposits processed successfully');
                    } else {
                      console.error(
                        'Error processing deposits:',
                        tokenResult.error || dueResult.error,
                      );
                    }
                    // two depsit transaction
                  }
                } else {
                  amount = element.amount;
                  const conversionRate = element.tokenPrice;
                  amount = amount / conversionRate;
                  if (
                    amount ===
                    findNextTransaction.total - findNextTransaction.amount
                  ) {
                    // two depsit transaction

                    const params: TokenDepositParams = {
                      userBlockchainId: element.userDetails.blockchainId,
                      token: findFromToken,
                      amount: amount,
                      dueToken: dueToken,
                      dueAmount: element.amount,
                      userId: elementUser.user,
                    };

                    const [tokenResult, dueResult] = await processTokenDeposits(
                      httpService,
                      params,
                    );

                    if (tokenResult.success && dueResult.success) {
                      console.log('Both deposits processed successfully');
                    } else {
                      console.error(
                        'Error processing deposits:',
                        tokenResult.error || dueResult.error,
                      );
                    }
                  }
                }
                const updateTransaction =
                  await withdrawTransactionModel.findByIdAndUpdate(
                    findNextTransaction._id,
                    {
                      dueWithdrawReference: element._id,
                      dueRemarks: DueRemarks.FULL_DEBIT_WITHDRAW,
                    },
                  );

                if (updateTransaction) {
                  console.log(
                    `Transaction ${element._id} updated successfully`,
                  );
                }
              }
            } else {
              const findPartialDebitTransaction = await extractValue(
                findNextTransaction.userRemarks,
                '$',
                'was deducted',
              );
              if (findPartialDebitTransaction === element.amount) {
                element.specialType = `Perfect Connection for Partial debited Transaction ${findNextTransaction._id} `;
              }
              const advanceValidation = await isTextExists(
                findNextTransaction.note,
                'Amount is deducted from due wallet.',
              );
              if (advanceValidation) {
                element.specialType =
                  element.specialType + ` and Andvance Check Passed`;
                let amount: number = 0;
                // Second processing stage (API calls)

                const findFromToken = await tokenModel.findById(
                  findNextTransaction.token,
                );
                if (findFromToken?.valueType === 'usd') {
                  amount = element.amount;
                  if (
                    amount ===
                    findNextTransaction.total - findNextTransaction.amount
                  ) {
                    // two depsit transaction
                    const params: TokenDepositParams = {
                      userBlockchainId: element.userDetails.blockchainId,
                      token: findFromToken,
                      amount: amount,
                      dueToken: dueToken,
                      dueAmount: amount,
                      userId: elementUser.user,
                    };

                    const [tokenResult, dueResult] = await processTokenDeposits(
                      httpService,
                      params,
                    );

                    if (tokenResult.success && dueResult.success) {
                      console.log('Both deposits processed successfully');
                    } else {
                      console.error(
                        'Error processing deposits:',
                        tokenResult.error || dueResult.error,
                      );
                    }
                  }
                } else {
                  amount = element.amount;
                  const conversionRate = element.tokenPrice;
                  amount = amount / conversionRate;
                  if (
                    amount ===
                    findNextTransaction.total - findNextTransaction.amount
                  ) {
                    // two depsit transaction
                    const params: TokenDepositParams = {
                      userBlockchainId: element.userDetails.blockchainId,
                      token: findFromToken,
                      amount: amount,
                      dueToken: dueToken,
                      dueAmount: element.amount,
                      userId: elementUser.user,
                    };

                    const [tokenResult, dueResult] = await processTokenDeposits(
                      httpService,
                      params,
                    );

                    if (tokenResult.success && dueResult.success) {
                      console.log('Both deposits processed successfully');
                    } else {
                      console.error(
                        'Error processing deposits:',
                        tokenResult.error || dueResult.error,
                      );
                    }
                  }
                }
                const updateTransaction =
                  await withdrawTransactionModel.findByIdAndUpdate(
                    findNextTransaction._id,
                    {
                      dueWithdrawReference: element._id,
                      dueRemarks: DueRemarks.PARTIAL_DEBIT_WITHDRAW,
                    },
                  );

                if (updateTransaction) {
                  console.log(
                    `Transaction ${element._id} updated successfully`,
                  );
                }
              }
            }
          } else {
            element.specialType = 'claim';
            const updateTransaction =
              await withdrawTransactionModel.findByIdAndUpdate(element._id, {
                dueRemarks: DueRemarks.NodeK_CLAIMED_FULL_DEBIT_WITHDRAW,
              });
            if (updateTransaction) {
              console.log(`Transaction ${element._id} updated successfully`);
            }

            let amount: number = 0;
            // Second processing stage (API calls)

            const findFromToken = await tokenModel.findOne({ symbol: 'lyk-w' });
            console.log(
              findFromToken,
              'findFromToken================claim===========',
              findFromToken.symbol,
            );

            amount = element.amount;
            const conversionRate = element.tokenPrice;
            amount = amount / conversionRate;

            // two depsit transaction
            const params: TokenDepositParams = {
              userBlockchainId: element.userDetails.blockchainId,
              token: findFromToken,
              amount: amount,
              dueToken: dueToken,
              dueAmount: element.amount,
              userId: elementUser.user,
            };

            const [tokenResult, dueResult] = await processTokenDeposits(
              httpService,
              params,
            );

            if (tokenResult.success && dueResult.success) {
              console.log('Both deposits processed successfully');
            } else {
              console.error(
                'Error processing deposits:',
                tokenResult.error || dueResult.error,
              );
            }
          }
        } else {
          const findPartialDebitTransaction = await extractValue(
            element.userRemarks,
            '$',
            'was deducted',
          );
          if (findPartialDebitTransaction && element.amount == 0) {
            element.specialType = 'full Debit ';
          } else if (findPartialDebitTransaction && element.amount != 0) {
            element.specialType = 'Partial Debit ';
          } else {
            element.specialType = 'normal ';
          }
          const findDebitTransaction = await extractValue(
            element.userRemarks,
            'Debit Wallet Deductions: $',
          );
          if (!findDebitTransaction) {
            element.specialType = element.specialType + 'withdraw process';
          }
        }
      }
      console.log(
        'User Connection Done',
        elementUser.user,
        '-',
        elementUser.username,
      );
    }

    // console.log(getWithdrawTransactions, 'getWithdrawTransactions');

    await appContext.close();
    process.exit(0);
    return false;
    // Find all wallets with DUE token
    const dueWallets = await walletModel
      .find({
        token: dueToken._id,
        deletedAt: null,
      })
      .select('_id user')
      .lean()
      .exec();

    console.log(`Total DUE wallets found: ${dueWallets.length}`);
  } catch (error) {
    console.error('An error occurred during transaction analysis:', error);
  } finally {
    await appContext.close();
    process.exit(0);
  }
}

bootstrap().catch((err) => {
  console.error('Unhandled error during script execution:', err);
  process.exit(1);
});
