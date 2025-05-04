import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import mongoose, { Model, Types } from 'mongoose';
import { Token } from '../../token/schemas/token.schema';
import { Wallet } from '../../wallet/schemas/wallet.schema';
import { WalletTransaction } from '../../wallet/schemas/wallet.transaction.schema.';
import { WithdrawTransaction } from '../../wallet/schemas/withdraw.transaction.schema';
import { DueRemarks } from '../../wallet/enums/request.status.enum';

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
    // Get model instances
    const tokenModel = appContext.get<Model<Token>>(Token.name + 'Model');
    const walletModel = appContext.get<Model<Wallet>>(Wallet.name + 'Model');
    const walletTransactionModel = appContext.get<Model<WalletTransaction>>(
      WalletTransaction.name + 'Model',
    );
    const withdrawTransactionModel = appContext.get<Model<WithdrawTransaction>>(
      WithdrawTransaction.name + 'Model',
    );

    // Find the DUE token
    const dueToken = await tokenModel.findOne({
      symbol: 'due',
      deletedAt: null,
    });

    if (!dueToken) {
      console.error('DUE token not found');
      return;
    }
    console.log(`Analyzing transactions for DUE token (ID: ${dueToken._id})`);

    const findUserListByDebitOut = await walletTransactionModel.aggregate([
      {
        $match: {
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
      const element =
        findUserListByDebitOut[0].debit_Wallet_In_AND_Out_User_List[index];

      const getWithdrawTransactions = await withdrawTransactionModel.aggregate([
        {
          $match: {
            user: element.user,
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
            total: 1,
            tokenDetails: {
              name: 1,
              valueType: 1,
            },
            userDetails: {
              username: 1,
              email: 1,
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

      for (let index = 0; index < getWithdrawTransactions.length; index++) {
        const element = getWithdrawTransactions[index];

        if (
          element.blockchainId === element.receiverAddress &&
          element.userRemarks === 'Deducted from due wallet.'
        ) {
          const findNextTransaction = getWithdrawTransactions[index + 1];
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
      console.log('User Connection Done', element.user, '-', element.username);
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
