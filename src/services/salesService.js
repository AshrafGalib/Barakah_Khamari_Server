const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const cashBalanceService = require("./cashBalanceService");

const SALE_COLLECTION = "sales";
const PRODUCT_COLLECTION = "products";
const CUSTOMER_COLLECTION = "customers";

// ==========================================
// Helper
// ==========================================

const toNumber = (value, defaultValue = 0) => {
  if (
    value === "" ||
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error("Numeric value সঠিক নয়");
  }

  return number;
};

// ==========================================
// Cash Payment Check
// ==========================================

const isCashPayment = (paymentMethod) => {
  if (!paymentMethod) {
    return true;
  }

  const method = String(paymentMethod)
    .trim()
    .toLowerCase();

  return (
    method === "ক্যাশ" ||
    method === "cash"
  );
};

// ==========================================
// Get All Sales
// ==========================================

const getSales = async () => {
  const db = getDB();

  return await db
    .collection(SALE_COLLECTION)
    .find({})
    .sort({
      saleDate: -1,
      createdAt: -1,
    })
    .toArray();
};

// ==========================================
// Get Single Sale
// ==========================================

const getSaleById = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return await db
    .collection(SALE_COLLECTION)
    .findOne({
      _id: new ObjectId(id),
    });
};

// ==========================================
// Find Customer By Name
// ==========================================

const findCustomerByName = async (
  db,
  customerName,
  session
) => {
  if (!customerName?.trim()) {
    return null;
  }

  return await db
    .collection(CUSTOMER_COLLECTION)
    .findOne(
      {
        name: customerName.trim(),
      },
      session ? { session } : {}
    );
};

// ==========================================
// Create / Update Due Customer
// ==========================================

const createOrUpdateDueCustomer = async (
  db,
  customerName,
  dueAmount,
  session
) => {
  if (dueAmount <= 0) {
    return null;
  }

  if (!customerName?.trim()) {
    throw new Error(
      "Due থাকলে Customer Name দিতে হবে"
    );
  }

  const name = customerName.trim();

  const existingCustomer =
    await findCustomerByName(
      db,
      name,
      session
    );

  const now = new Date();

  // ========================================
  // Existing Customer
  // ========================================

  if (existingCustomer) {
    const currentDue =
      Number(existingCustomer.dueAmount) || 0;

    const newDue = Number(
      (
        currentDue +
        dueAmount
      ).toFixed(2)
    );

    const currentTotalPurchase =
      Number(
        existingCustomer.totalPurchase
      ) || 0;

    const newTotalPurchase =
      Number(
        (
          currentTotalPurchase +
          dueAmount
        ).toFixed(2)
      );

    await db
      .collection(CUSTOMER_COLLECTION)
      .updateOne(
        {
          _id: existingCustomer._id,
        },
        {
          $set: {
            dueAmount: newDue,

            totalPurchase:
              newTotalPurchase,

            status: "সক্রিয়",

            updatedAt: now,
          },
        },
        {
          ...(session && { session }),
        }
      );

    return {
      ...existingCustomer,

      dueAmount: newDue,

      totalPurchase:
        newTotalPurchase,

      status: "সক্রিয়",

      updatedAt: now,
    };
  }

  // ========================================
  // New Due Customer
  // ========================================

  const customer = {
    customerCode:
      `DUE-${Date.now()}`,

    customerNumber: null,

    customerType: "due",

    paymentType: "বাকি",

    name,

    phone: "",

    address: "",

    totalPurchase:
      Number(
        dueAmount.toFixed(2)
      ),

    paidAmount: 0,

    dueAmount:
      Number(
        dueAmount.toFixed(2)
      ),

    notes: "",

    status: "সক্রিয়",

    createdAt: now,

    updatedAt: now,
  };

  const result =
    await db
      .collection(CUSTOMER_COLLECTION)
      .insertOne(
        customer,
        {
          ...(session && { session }),
        }
      );

  return {
    _id: result.insertedId,

    ...customer,
  };
};

// ==========================================
// Validate Sale Item
// ==========================================

const validateSaleItem = async (
  db,
  item
) => {
  if (!item?.productId) {
    throw new Error(
      "প্রতিটি item-এর Product নির্বাচন করুন"
    );
  }

  if (!ObjectId.isValid(item.productId)) {
    throw new Error(
      "Invalid Product ID"
    );
  }

  const product =
    await db
      .collection(PRODUCT_COLLECTION)
      .findOne({
        _id: new ObjectId(
          item.productId
        ),
      });

  if (!product) {
    throw new Error(
      "Product পাওয়া যায়নি"
    );
  }

  const isPoultry =
    product.unit === "কেজি + পিস";

  const quantity =
    toNumber(item.quantity);

  const pieces =
    toNumber(item.pieces);

  const weight =
    toNumber(item.weight);

  const sellingPrice =
    toNumber(item.sellingPrice);

  // ========================================
  // Negative Validation
  // ========================================

  if (
    quantity < 0 ||
    pieces < 0 ||
    weight < 0 ||
    sellingPrice < 0
  ) {
    throw new Error(
      "কোনো value negative হতে পারবে না"
    );
  }

  // ========================================
  // Selling Price
  // ========================================

  if (sellingPrice <= 0) {
    throw new Error(
      `${product.name}: Selling Price দিন`
    );
  }

  // ========================================
  // Poultry
  // ========================================

  if (isPoultry) {
    if (pieces <= 0) {
      throw new Error(
        `${product.name}: Pieces দিন`
      );
    }

    if (weight <= 0) {
      throw new Error(
        `${product.name}: Weight দিন`
      );
    }

    const stockPieces =
      Number(product.stockPieces) || 0;

    const stockWeight =
      Number(product.totalWeight) || 0;

    if (pieces > stockPieces) {
      throw new Error(
        `${product.name}: পর্যাপ্ত Pieces stock নেই। Available: ${stockPieces}`
      );
    }

    if (weight > stockWeight) {
      throw new Error(
        `${product.name}: পর্যাপ্ত Weight stock নেই। Available: ${stockWeight} KG`
      );
    }
  }

  // ========================================
  // Normal Product
  // ========================================

  else {
    if (quantity <= 0) {
      throw new Error(
        `${product.name}: Quantity দিন`
      );
    }

    const stockQuantity =
      Number(product.stockQuantity) || 0;

    if (quantity > stockQuantity) {
      throw new Error(
        `${product.name}: পর্যাপ্ত stock নেই। Available: ${stockQuantity}`
      );
    }
  }

  // ========================================
  // Calculate Item Total
  // ========================================

  const itemTotal = isPoultry
    ? weight * sellingPrice
    : quantity * sellingPrice;

  return {
    product,

    isPoultry,

    quantity,

    pieces,

    weight,

    sellingPrice,

    itemTotal:
      Number(
        itemTotal.toFixed(2)
      ),
  };
};

// ==========================================
// Create Sale
// ==========================================

const createSale = async (saleData) => {
  const db = getDB();

  const {
    customerName,
    items,
    discount,
    paidAmount,
    paymentMethod,
    notes,
    saleDate,
    invoiceNo,
  } = saleData;

  // ========================================
  // Items Validation
  // ========================================

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new Error(
      "কমপক্ষে একটি Product যোগ করুন"
    );
  }

  // ========================================
  // Validate Items
  // ========================================

  const validatedItems = [];

  for (const item of items) {
    const validated =
      await validateSaleItem(
        db,
        item
      );

    validatedItems.push(
      validated
    );
  }

  // ========================================
  // Calculate Subtotal
  // ========================================

  const calculatedSubtotal =
    validatedItems.reduce(
      (sum, item) =>
        sum + item.itemTotal,
      0
    );

  const finalSubtotal =
    Number(
      calculatedSubtotal.toFixed(2)
    );

  // ========================================
  // Discount
  // ========================================

  const finalDiscount =
    Math.max(
      0,
      toNumber(discount)
    );

  if (
    finalDiscount >
    finalSubtotal
  ) {
    throw new Error(
      "Discount Subtotal-এর চেয়ে বেশি হতে পারবে না"
    );
  }

  // ========================================
  // Net Total
  // ========================================

  const finalTotalAmount =
    Number(
      (
        finalSubtotal -
        finalDiscount
      ).toFixed(2)
    );

  // ========================================
  // Paid Amount
  // ========================================

  const finalPaidAmount =
    Math.max(
      0,
      toNumber(paidAmount)
    );

  if (
    finalPaidAmount >
    finalTotalAmount
  ) {
    throw new Error(
      "Paid Amount Net Total-এর চেয়ে বেশি হতে পারবে না"
    );
  }

  // ========================================
  // Due Amount
  // ========================================

  const finalDueAmount =
    Number(
      (
        finalTotalAmount -
        finalPaidAmount
      ).toFixed(2)
    );

  // ========================================
  // Customer Required If Due
  // ========================================

  if (
    finalDueAmount > 0 &&
    !customerName?.trim()
  ) {
    throw new Error(
      "Due থাকলে Customer Name দিতে হবে"
    );
  }

  // ========================================
  // Sale Date
  // ========================================

  const finalSaleDate = saleDate
    ? new Date(saleDate)
    : new Date();

  if (
    Number.isNaN(
      finalSaleDate.getTime()
    )
  ) {
    throw new Error(
      "Sale Date সঠিক নয়"
    );
  }

  // ========================================
  // Payment Method
  // ========================================

  const finalPaymentMethod =
    paymentMethod?.trim() ||
    "ক্যাশ";

  // ========================================
  // Cash Received
  // ========================================

  const finalCashReceivedAmount =
    isCashPayment(
      finalPaymentMethod
    )
      ? finalPaidAmount
      : 0;

  // ========================================
  // Bangladesh Cash Date
  // ========================================

  const cashBalanceDate =
    cashBalanceService
      .getBangladeshDateString(
        finalSaleDate
      );

  // ========================================
  // MongoDB Transaction
  // ========================================

  const session =
    db.client.startSession();

  try {
    let createdSale = null;

    await session.withTransaction(
      async () => {
        const now = new Date();

        // ====================================
        // Customer Due
        // ====================================

        let customer = null;

        if (
          finalDueAmount > 0
        ) {
          customer =
            await createOrUpdateDueCustomer(
              db,
              customerName,
              finalDueAmount,
              session
            );
        }

        // ====================================
        // Prepare Sale Items
        // ====================================

        const saleItems =
          validatedItems.map(
            (item) => ({
              productId:
                item.product._id,

              productName:
                item.product.name,

              categoryId:
                item.product.categoryId ||
                null,

              categoryName:
                item.product.categoryName ||
                "",

              unit:
                item.product.unit,

              quantity:
                item.isPoultry
                  ? null
                  : item.quantity,

              pieces:
                item.isPoultry
                  ? item.pieces
                  : null,

              weight:
                item.isPoultry
                  ? item.weight
                  : null,

              sellingPrice:
                item.sellingPrice,

              totalAmount:
                item.itemTotal,
            })
          );

        // ====================================
        // Sale Document
        // ====================================

        const sale = {
          saleDate:
            finalSaleDate,

          invoiceNo:
            invoiceNo?.trim() || "",

          customerId:
            customer?._id || null,

          customerName:
            customer?.name || "",

          items:
            saleItems,

          subtotal:
            finalSubtotal,

          discount:
            finalDiscount,

          totalAmount:
            finalTotalAmount,

          paidAmount:
            finalPaidAmount,

          dueAmount:
            finalDueAmount,

          paymentMethod:
            finalPaymentMethod,

          cashReceivedAmount:
            finalCashReceivedAmount,

          notes:
            notes?.trim() || "",

          createdAt: now,

          updatedAt: now,
        };

        // ====================================
        // Insert Sale
        // ====================================

        const saleResult =
          await db
            .collection(
              SALE_COLLECTION
            )
            .insertOne(
              sale,
              {
                session,
              }
            );

        // ====================================
        // Update Product Stock
        // ====================================

        for (
          const item of validatedItems
        ) {
          let stockUpdate;

          // ==================================
          // Poultry
          // ==================================

          if (
            item.isPoultry
          ) {
            stockUpdate =
              await db
                .collection(
                  PRODUCT_COLLECTION
                )
                .updateOne(
                  {
                    _id:
                      item.product._id,

                    stockPieces: {
                      $gte:
                        item.pieces,
                    },

                    totalWeight: {
                      $gte:
                        item.weight,
                    },
                  },
                  {
                    $inc: {
                      stockPieces:
                        -item.pieces,

                      totalWeight:
                        -item.weight,
                    },

                    $set: {
                      updatedAt:
                        now,
                    },
                  },
                  {
                    session,
                  }
                );
          }

          // ==================================
          // Normal Product
          // ==================================

          else {
            stockUpdate =
              await db
                .collection(
                  PRODUCT_COLLECTION
                )
                .updateOne(
                  {
                    _id:
                      item.product._id,

                    stockQuantity: {
                      $gte:
                        item.quantity,
                    },
                  },
                  {
                    $inc: {
                      stockQuantity:
                        -item.quantity,
                    },

                    $set: {
                      updatedAt:
                        now,
                    },
                  },
                  {
                    session,
                  }
                );
          }

          if (
            stockUpdate.matchedCount ===
            0
          ) {
            throw new Error(
              `${item.product.name}: Stock update করা যায়নি`
            );
          }
        }

        // ====================================
        // Update Cash Balance
        // ====================================

        if (
          finalCashReceivedAmount > 0
        ) {
          await cashBalanceService
            .updateCashSales(
              cashBalanceDate,
              finalCashReceivedAmount,
              session
            );
        }

        // ====================================
        // Created Sale
        // ====================================

        createdSale = {
          _id:
            saleResult.insertedId,

          ...sale,
        };
      }
    );

    return createdSale;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// Delete Sale
// ==========================================

const deleteSale = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const session =
    db.client.startSession();

  try {
    let deleted = false;

    await session.withTransaction(
      async () => {
        // ====================================
        // Find Sale
        // ====================================

        const sale =
          await db
            .collection(
              SALE_COLLECTION
            )
            .findOne(
              {
                _id:
                  new ObjectId(id),
              },
              {
                session,
              }
            );

        if (!sale) {
          throw new Error(
            "Sale পাওয়া যায়নি"
          );
        }

        // ====================================
        // Restore Product Stock
        // ====================================

        if (
          Array.isArray(
            sale.items
          )
        ) {
          for (
            const item of sale.items
          ) {
            // ==================================
            // Poultry
            // ==================================

            if (
              item.unit ===
              "কেজি + পিস"
            ) {
              const stockUpdate =
                await db
                  .collection(
                    PRODUCT_COLLECTION
                  )
                  .updateOne(
                    {
                      _id:
                        item.productId,
                    },
                    {
                      $inc: {
                        stockPieces:
                          Number(
                            item.pieces
                          ) || 0,

                        totalWeight:
                          Number(
                            item.weight
                          ) || 0,
                      },

                      $set: {
                        updatedAt:
                          new Date(),
                      },
                    },
                    {
                      session,
                    }
                  );

              if (
                stockUpdate.matchedCount ===
                0
              ) {
                throw new Error(
                  `${item.productName}: Product stock restore করা যায়নি`
                );
              }
            }

            // ==================================
            // Normal Product
            // ==================================

            else {
              const stockUpdate =
                await db
                  .collection(
                    PRODUCT_COLLECTION
                  )
                  .updateOne(
                    {
                      _id:
                        item.productId,
                    },
                    {
                      $inc: {
                        stockQuantity:
                          Number(
                            item.quantity
                          ) || 0,
                      },

                      $set: {
                        updatedAt:
                          new Date(),
                      },
                    },
                    {
                      session,
                    }
                  );

              if (
                stockUpdate.matchedCount ===
                0
              ) {
                throw new Error(
                  `${item.productName}: Product stock restore করা যায়নি`
                );
              }
            }
          }
        }

        // ====================================
        // Restore Customer Due
        // ====================================

        if (
          sale.customerId &&
          Number(
            sale.dueAmount
          ) > 0
        ) {
          const customer =
            await db
              .collection(
                CUSTOMER_COLLECTION
              )
              .findOne(
                {
                  _id:
                    sale.customerId,
                },
                {
                  session,
                }
              );

          if (customer) {
            const currentDue =
              Number(
                customer.dueAmount
              ) || 0;

            const saleDue =
              Number(
                sale.dueAmount
              ) || 0;

            // ==================================
            // Only remove currently outstanding
            // due. Never make due negative.
            // ==================================

            const dueToRemove =
              Math.min(
                currentDue,
                saleDue
              );

            const newDue =
              Number(
                (
                  currentDue -
                  dueToRemove
                ).toFixed(2)
              );

            const currentTotalPurchase =
              Number(
                customer.totalPurchase
              ) || 0;

            const newTotalPurchase =
              Math.max(
                0,
                Number(
                  (
                    currentTotalPurchase -
                    saleDue
                  ).toFixed(2)
                )
              );

            await db
              .collection(
                CUSTOMER_COLLECTION
              )
              .updateOne(
                {
                  _id:
                    sale.customerId,
                },
                {
                  $set: {
                    dueAmount:
                      newDue,

                    totalPurchase:
                      newTotalPurchase,

                    status:
                      newDue === 0
                        ? "পরিশোধিত"
                        : "সক্রিয়",

                    updatedAt:
                      new Date(),
                  },
                },
                {
                  session,
                }
              );
          }
        }

        // ====================================
        // Reverse Cash Balance
        // ====================================

        let cashReceivedAmount =
          Number(
            sale.cashReceivedAmount
          );

        // ====================================
        // Backward Compatibility
        // ====================================

        if (
          !Number.isFinite(
            cashReceivedAmount
          )
        ) {
          cashReceivedAmount =
            isCashPayment(
              sale.paymentMethod
            )
              ? Number(
                  sale.paidAmount
                ) || 0
              : 0;
        }

        if (
          cashReceivedAmount > 0
        ) {
          const cashBalanceDate =
            cashBalanceService
              .getBangladeshDateString(
                sale.saleDate
              );

          await cashBalanceService
            .updateCashSales(
              cashBalanceDate,
              -cashReceivedAmount,
              session
            );
        }

        // ====================================
        // Delete Sale
        // ====================================

        const result =
          await db
            .collection(
              SALE_COLLECTION
            )
            .deleteOne(
              {
                _id:
                  new ObjectId(id),
              },
              {
                session,
              }
            );

        if (
          result.deletedCount ===
          0
        ) {
          throw new Error(
            "Sale delete করা যায়নি"
          );
        }

        deleted = true;
      }
    );

    return deleted;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// Export
// ==========================================

module.exports = {
  getSales,
  getSaleById,
  createSale,
  deleteSale,
};
