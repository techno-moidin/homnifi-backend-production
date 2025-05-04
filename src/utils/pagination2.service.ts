export const aggregatePaginate2 = async (
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

    // Execute aggregation pipeline
    const result = await model
      .aggregate([
        ...matchPipeline,
        {
          $facet: {
            totalCount: [{ $count: 'total' }],
            paginatedResults: [
              { $skip: (numPage - 1) * numLimit },
              { $limit: numLimit },
              ...pipeline,
            ],
          },
        },
      ])
      .then(async (result) => {
        // Initialize default values
        let totalCount = 0;
        let paginatedResults = [];

        // Check if result has data and extract pagination metadata and paginated results
        if (result[0] && result[0].totalCount[0]) {
          totalCount = result[0].totalCount[0].total;
        }
        if (result[0] && result[0].paginatedResults) {
          paginatedResults = result[0].paginatedResults;
        }

        const totalPages = Math.ceil(totalCount / numLimit);
        const currentPage = numPage;

        // Return paginated data along with metadata
        return {
          totalCount,
          list: paginatedResults,
          totalPages,
          currentPage,
        };
      });

    return result;
  } catch (oError) {
    throw oError;
  }
};
