/**
 * Application-level error carrying an HTTP status, a stable machine-readable
 * `code`, and optional structured `details`. Controllers/services throw these;
 * the error middleware is the single place that serialises them to a response.
 */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DUPLICATE_SKU"
  | "DUPLICATE_VARIANT"
  | "INSUFFICIENT_STOCK"
  | "VERSION_CONFLICT"
  | "INTERNAL";

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, "VALIDATION_ERROR", message, details);
  }
  static unauthorized(message = "Authentication required") {
    return new ApiError(401, "UNAUTHORIZED", message);
  }
  static forbidden(message = "You do not have access to this resource") {
    return new ApiError(403, "FORBIDDEN", message);
  }
  static notFound(message = "Resource not found") {
    return new ApiError(404, "NOT_FOUND", message);
  }
  static conflict(code: ErrorCode, message: string, details?: unknown) {
    return new ApiError(409, code, message, details);
  }
}
