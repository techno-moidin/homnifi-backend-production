// export const aggregatePaginate3 = async (
//   model,
//   matchPipeline,
//   pipeline,
//   page = 1,
//   limit = 10,
// ) => {
//   try {
//     // Convert page and limit to numbers
//     const numLimit = Number(limit);
//     const numPage = Number(page);

//     // Execute aggregation pipeline
//     const result = await model
//       .aggregate([
//         ...matchPipeline,
//         {
//           $facet: {
//             totalCount: [{ $count: 'total' }],
//             paginatedResults: [
//               { $skip: (numPage - 1) * numLimit },
//               { $limit: numLimit },
//               ...pipeline,
//             ],
//           },
//         },
//       ])
//       .then(async (result) => {
//         // Initialize default values
//         let totalCount = 0;
//         let paginatedResults = [];

//         // Check if result has data and extract pagination metadata and paginated results
//         if (result[0] && result[0].totalCount[0]) {
//           totalCount = result[0].totalCount[0].total;
//         }
//         if (result[0] && result[0].paginatedResults) {
//           paginatedResults = result[0].paginatedResults;
//         }

//         const totalPages = Math.ceil(totalCount / numLimit);
//         const currentPage = numPage;

//         // Return paginated data along with metadata
//         return {
//           totalCount,
//           list: paginatedResults,
//           totalPages,
//           currentPage,
//         };
//       });

//     return result;
//   } catch (oError) {
//     throw oError;
//   }
// };

export const aggregatePaginate3 = async (
  model,
  matchPipeline,
  pipeline,
  page = 1,
  limit = 10,
) => {
  try {
    // Convert page and limit to numbers
    const numLimit = Number(limit);
    const numPage = Number(page);

    const [totalCountResult, result] = await Promise.all([
      model.aggregate([...matchPipeline, { $count: 'total' }]),
      model.aggregate([
        ...matchPipeline,
        { $skip: (numPage - 1) * numLimit },
        { $limit: numLimit },
        ...pipeline,
      ]),
    ]);

    const totalCount =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // const totalCount = await model.estimatedDocumentCount();

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / numLimit);
    const currentPage = numPage;

    // Return paginated data along with metadata
    return {
      totalCount,
      list: result,
      totalPages,
      currentPage,
    };
  } catch (oError) {
    throw oError;
  }
};
