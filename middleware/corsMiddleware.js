const cors = require('cors');

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "n6tec-erp.c3w6qgq4yshi.us-east-2.rds.amazonaws.com",
  "http://n6erp.s3-website.us-east-2.amazonaws.com",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed"));
    }
  },
  methods: "GET,POST,PUT,DELETE",
  credentials: true
};

module.exports = cors(corsOptions);