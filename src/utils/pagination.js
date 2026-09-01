/**
 * Shared pagination helpers for list services. Parse query input first, then
 * pass the result to `paginate` to return data and consistent metadata together.
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Normalizes `page` / `limit` query params into safe integers and derives
 * the mongoose skip/limit pair from them.
 */
export function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (!Number.isInteger(page) || page < 1) page = DEFAULT_PAGE;
  if (!Number.isInteger(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Builds a consistent pagination envelope for list responses.
 */
export function buildMeta({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

/**
 * Runs a mongoose find + count in parallel and returns a paginated envelope.
 */
export async function paginate(model, filter, { page, limit, skip }, options = {}) {
  const { sort = '-createdAt', select, populate } = options;

  let query = model.find(filter).sort(sort).skip(skip).limit(limit);
  if (select) query = query.select(select);
  if (populate) query = query.populate(populate);

  const [data, total] = await Promise.all([query.exec(), model.countDocuments(filter)]);

  return { data, meta: buildMeta({ page, limit, total }) };
}
