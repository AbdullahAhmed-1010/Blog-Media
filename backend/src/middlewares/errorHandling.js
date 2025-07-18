const errorHandling = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message || "Internal Server Error";
  error.statusCode = err.statusCode || 500;

  // Log the original error
  console.error("Error log:", err);

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    error.message = "Resource not found";
    error.statusCode = 404;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    error.message = "Duplicate field value entered";
    error.statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    error.message = Object.values(err.errors)
      .map((val) => val.message)
      .join(", ");
    error.statusCode = 400;
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    error.message = "Invalid token";
    error.statusCode = 401;
  }

  if (err.name === "TokenExpiredError") {
    error.message = "Token expired";
    error.statusCode = 401;
  }

  // Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    error.message = "File size too large";
    error.statusCode = 400;
  }

  if (err.code === "LIMIT_FILE_COUNT") {
    error.message = "Too many files to handle";
    error.statusCode = 400;
  }

  // Final error response
  res.status(error.statusCode).json({
    success: false,
    message: error.message,
  });
};

export default errorHandling;