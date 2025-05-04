export const aggregatePaginate = async (
  model,
  pipeline,
  page = 1,
  limit = 10,
) => {
  // Convert page and limit to numbers
  const numLimit = Number(limit);
  const numPage = Number(page);

  // Execute aggregation pipeline
  const result = await model
    .aggregate([
      ...pipeline,
      {
        $facet: {
          totalCount: [{ $count: 'total' }],
          paginatedResults: [
            { $skip: (numPage - 1) * numLimit },
            { $limit: numLimit },
          ],
        },
      },
    ])
    .then(async (result) => {
      let totalCount = 0;
      let paginatedResults = [];

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
};
