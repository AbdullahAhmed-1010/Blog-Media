const errorHandling = async (error, req, res, next) => {
  let error = { ...error }
  error.message = error.message

  // log error
  console.error(error)

  // mongoose bad objectId
  if (error.name === "castError") {
    const message = "resource not found"
    error = {
      message,
      statusCode: 404
    }
  }

  // mongoose duplicate key
  if (error.code === 11000) {
    const message = "duplicate field value entered"
    error = {
      message,
      statusCode: 400
    }
  }

  // mongoose validation error
  if (error.name === "validationError") {
    const message = Object.values(error.errors)
      .map((val) => val.message)
      .join(", ")
    error = {
      message,
      statusCode: 400
    }
  }

  // JWT errors
  if (error.name === "JsonWebTokenError") {
    const message = "invalid token"
    error = {
      message,
      statusCode: 401
    }
  }
  if (error.name === "TokenExpiredError") {
    const message = "token expired"
    error = {
      message,
      statusCode: 401
    }
  }

  // multer errors
  if(error.code === "LIMIT_FILE_SIZE") {
    const message = "file size too large"
    error = {
        message,
        statusCode: 400
    }
  }
  if(error.code === "LIMIT_FILE_COUNT") {
    const message = "too many files to handle"
    error = {
        message,
        statusCode: 400
    }
  }

  // server error
  res.status(error.statusCode || 500).json({
    success: false,
    message: "server error",
    error: error.message
  })
}

// handle unhandled promise rejections
process.on("unhandledRejection", (error, promise) => {
    console.log(`error: ${error.message}`)
    server.close(() => {
        process.exit(1)
    })
})

export default errorHandling