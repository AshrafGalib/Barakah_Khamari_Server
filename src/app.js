const express = require("express");
const cors = require("cors");

const categoryRoutes =
  require("./routes/categoryRoutes");

const supplierRoutes =
  require("./routes/supplierRoutes");

const productRoutes =
  require("./routes/productRoutes");

const purchaseRoutes =
  require("./routes/purchaseRoutes");

const customerRoutes =
  require("./routes/customerRoutes");

const salesRoutes =
  require("./routes/salesRoutes");

const dashboardRoutes =
  require("./routes/dashboardRoutes");

const expenseRoutes =
  require("./routes/expenseRoutes");

const cashBalanceRoutes =
  require("./routes/cashBalanceRoutes");


const authRoutes = require("./routes/authRoutes");


const roleRoutes =
  require("./routes/roleRoutes");

const userRoutes =
  require("./routes/userRoutes");

const app = express();

// ======================================================
// CORS
// ======================================================

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:5173",
  "https://barakahkhamari.netlify.app",
];

// Normalize origin
const normalizeOrigin = (origin) => {
  if (!origin) {
    return origin;
  }

  return origin.replace(/\/$/, "");
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header
      // e.g. Postman, server-to-server requests
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin =
        normalizeOrigin(origin);

      if (
        allowedOrigins.includes(
          normalizedOrigin
        )
      ) {
        return callback(null, true);
      }

      console.error(
        "CORS blocked origin:",
        origin
      );

      return callback(
        new Error("Not allowed by CORS")
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ======================================================
// Middleware
// ======================================================

app.use(express.json());

// ======================================================
// Root
// ======================================================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message:
      "বারাকাহ খামারি Backend চলছে",
  });
});

// ======================================================
// Routes
// ======================================================

app.use(
  "/api/categories",
  categoryRoutes
);

app.use(
  "/api/suppliers",
  supplierRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/purchases",
  purchaseRoutes
);

app.use(
  "/api/customers",
  customerRoutes
);

app.use(
  "/api/sales",
  salesRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/expenses",
  expenseRoutes
);

app.use(
  "/api/cash-balance",
  cashBalanceRoutes
);

app.use("/api/auth", authRoutes);

app.use(
  "/api/roles",
  roleRoutes
);

app.use(
  "/api/users",
  userRoutes
);

// ======================================================
// Export
// ======================================================

module.exports = app;