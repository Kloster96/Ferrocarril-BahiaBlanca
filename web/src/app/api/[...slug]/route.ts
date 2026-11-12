import { apiError } from "@/server/api-error";

// Anything under /api/ that is not a real route answers in the API's own error format, not an HTML page.
// Existing routes win over this catch-all.
const notFound = () => apiError("not_found", "This API route does not exist.", 404);

export {
  notFound as DELETE,
  notFound as GET,
  notFound as HEAD,
  notFound as OPTIONS,
  notFound as PATCH,
  notFound as POST,
  notFound as PUT,
};
