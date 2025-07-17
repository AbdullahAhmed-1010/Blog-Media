import cors from "cors"

const allowedOrigin = {
  production: [
    "https://yourdomain.com",
    "https://www.yourdomain.com",
    "https://admin.yourdomain.com"
  ],
  developement: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173"
  ]
}

const commonOptions = {
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Access-Token"
  ],
  optionsSuccessStatus: 200,
  maxAge: 86400
}

// dynamically handle origin check
const dynamicOrigin = (origin, callback) => {
  if (!origin) {
    return callback(null, true)
  }
  const env = process.env.NODE_ENV || "development"
  const isAllowed = allowedOrigin[env].includes(origin)

  callback(isAllowed ? null : (new Error("not allowed by CORS"), isAllowed))
}

// main CORS middleware
const corsMiddleware = cors({
  ...commonOptions,
  origin: dynamicOrigin
})

// preflight handler
const handlePreFlight = (req, res, next) => {
  if (req.method === "OPTIONS") {
    res.set({
      "Access-Control-Allow-Origin": req.headers.origin || "*",
      "Access-Control-Allow-Methods": commonOptions.methods.join(","),
      "Access-Control-Allow-Headers": commonOptions.allowedHeaders.join(","),
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": commonOptions.maxAge,
    })
    return res.status(200).end()
  }
  next()
}

export {corsMiddleware, handlePreFlight}