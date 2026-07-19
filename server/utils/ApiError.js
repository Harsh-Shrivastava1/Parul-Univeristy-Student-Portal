/** Typed HTTP error carrying a status code for the central error handler. */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

module.exports = ApiError;
