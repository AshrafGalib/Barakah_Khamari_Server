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

const app = express();

// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: "http://localhost:5173",
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

// ======================================================
// Export
// ======================================================

module.exports = app;