const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const PURCHASE_COLLECTION = "purchases";
const PRODUCT_COLLECTION = "products";
const SUPPLIER_COLLECTION = "suppliers";
const CASH_BALANCE_COLLECTION = "cashBalances";

// ==========================================
// Helper
// ==========================================

const toNumber = (
  value,
  defaultValue = 0
) => {
  if (
    value === "" ||
    value === undefined ||
    value === null
  ) {
    return defaultValue;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(
      "Numeric value সঠিক নয়"
    );
  }

  return number;
};

// ==========================================
// Bangladesh Date
// ==========================================

const getBangladeshDateString = (
  date = new Date()
) => {
  return new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);
};

// ==========================================
// Get All Purchases
// ==========================================

const getPurchases = async () => {
  const db = getDB();

  return await db
    .collection(PURCHASE_COLLECTION)
    .find({})
    .sort({
      purchaseDate: -1,
      createdAt: -1,
    })
    .toArray();
};

// ==========================================
// Get Single Purchase
// ==========================================

const getPurchaseById = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return await db
    .collection(PURCHASE_COLLECTION)
    .findOne({
      _id: new ObjectId(id),
    });
};

// ==========================================
// Create Purchase
// ==========================================

const createPurchase = async (
  purchaseData
) => {
  const db = getDB();

  const {
    purchaseDate,
    invoiceNo,
    supplierId,
    supplierName,

    productId,

    quantity,
    pieces,
    weight,

    buyingPrice,

    paidAmount,

    paymentMethod,
    notes,
  } = purchaseData;

  // ========================================
  // Basic Validation
  // ========================================

  if (!productId) {
    throw new Error(
      "Product নির্বাচন করুন"
    );
  }

  if (!ObjectId.isValid(productId)) {
    throw new Error(
      "Invalid Product ID"
    );
  }

  if (
    supplierId &&
    !ObjectId.isValid(supplierId)
  ) {
    throw new Error(
      "Invalid Supplier ID"
    );
  }

  // ========================================
  // Numbers
  // ========================================

  const finalQuantity =
    toNumber(quantity);

  const finalPieces =
    toNumber(pieces);

  const finalWeight =
    toNumber(weight);

  const finalBuyingPrice =
    toNumber(buyingPrice);

  const finalPaidAmount =
    toNumber(paidAmount);

  // ========================================
  // Negative Validation
  // ========================================

  if (
    finalQuantity < 0 ||
    finalPieces < 0 ||
    finalWeight < 0 ||
    finalBuyingPrice < 0 ||
    finalPaidAmount < 0
  ) {
    throw new Error(
      "কোনো value negative হতে পারবে না"
    );
  }

  // ========================================
  // Product
  // ========================================

  const product =
    await db
      .collection(PRODUCT_COLLECTION)
      .findOne({
        _id: new ObjectId(productId),
      });

  if (!product) {
    throw new Error(
      "Product পাওয়া যায়নি"
    );
  }

  const isPoultry =
    product.unit === "কেজি + পিস";

  // ========================================
  // Product-specific Validation
  // ========================================

  if (isPoultry) {
    if (finalPieces <= 0) {
      throw new Error(
        "Poultry product-এর Pieces দিন"
      );
    }

    if (finalWeight <= 0) {
      throw new Error(
        "Poultry product-এর Weight দিন"
      );
    }
  } else {
    if (finalQuantity <= 0) {
      throw new Error(
        "Product Quantity দিন"
      );
    }
  }

  // ========================================
  // Calculate Total Amount
  // ========================================

  let finalTotalAmount = 0;

  if (isPoultry) {
    finalTotalAmount =
      finalWeight *
      finalBuyingPrice;
  } else {
    finalTotalAmount =
      finalQuantity *
      finalBuyingPrice;
  }

  finalTotalAmount =
    Number(
      finalTotalAmount.toFixed(2)
    );

  // ========================================
  // Paid / Due
  // ========================================

  if (
    finalPaidAmount >
    finalTotalAmount
  ) {
    throw new Error(
      "Paid Amount Total Amount-এর চেয়ে বেশি হতে পারবে না"
    );
  }

  const finalDueAmount =
    Number(
      (
        finalTotalAmount -
        finalPaidAmount
      ).toFixed(2)
    );

  // ========================================
  // Purchase Date
  // ========================================

  const finalPurchaseDate =
    purchaseDate
      ? new Date(purchaseDate)
      : new Date();

  if (
    Number.isNaN(
      finalPurchaseDate.getTime()
    )
  ) {
    throw new Error(
      "Purchase Date সঠিক নয়"
    );
  }

  // ========================================
  // Bangladesh Date
  // ========================================

  const purchaseDateString =
    getBangladeshDateString(
      finalPurchaseDate
    );

  // ========================================
  // Supplier
  // ========================================

  let finalSupplierName =
    supplierName?.trim() || "";

  if (supplierId) {
    const supplier =
      await db
        .collection(
          SUPPLIER_COLLECTION
        )
        .findOne({
          _id: new ObjectId(
            supplierId
          ),
        });

    if (!supplier) {
      throw new Error(
        "Supplier পাওয়া যায়নি"
      );
    }

    finalSupplierName =
      supplier.name ||
      finalSupplierName;
  }

  // ========================================
  // Invoice Number
  // ========================================

  const finalInvoiceNo =
    invoiceNo?.trim() || "";

  // ========================================
  // Payment Method
  // ========================================

  const finalPaymentMethod =
    paymentMethod?.trim() ||
    "ক্যাশ";

  // ========================================
  // Start Transaction
  // ========================================

  const session =
    db.client.startSession();

  try {
    let createdPurchase;

    await session.withTransaction(
      async () => {
        const now =
          new Date();

        // ====================================
        // Purchase Document
        // ====================================

        const purchase = {
          purchaseDate:
            finalPurchaseDate,

          invoiceNo:
            finalInvoiceNo,

          supplierId:
            supplierId
              ? new ObjectId(
                  supplierId
                )
              : null,

          supplierName:
            finalSupplierName,

          productId:
            new ObjectId(
              productId
            ),

          productName:
            product.name,

          unit:
            product.unit,

          quantity:
            isPoultry
              ? null
              : finalQuantity,

          pieces:
            isPoultry
              ? finalPieces
              : null,

          weight:
            isPoultry
              ? finalWeight
              : null,

          buyingPrice:
            finalBuyingPrice,

          totalAmount:
            finalTotalAmount,

          paidAmount:
            finalPaidAmount,

          dueAmount:
            finalDueAmount,

          paymentMethod:
            finalPaymentMethod,

          notes:
            notes?.trim() || "",

          createdAt:
            now,

          updatedAt:
            now,
        };

        // ====================================
        // Insert Purchase
        // ====================================

        const result =
          await db
            .collection(
              PURCHASE_COLLECTION
            )
            .insertOne(
              purchase,
              { session }
            );

        // ====================================
        // Update Product Stock
        // ====================================

        let stockUpdate;

        if (isPoultry) {
          stockUpdate =
            await db
              .collection(
                PRODUCT_COLLECTION
              )
              .updateOne(
                {
                  _id:
                    new ObjectId(
                      productId
                    ),
                },
                {
                  $inc: {
                    stockPieces:
                      finalPieces,

                    totalWeight:
                      finalWeight,
                  },

                  $set: {
                    updatedAt:
                      now,
                  },
                },
                { session }
              );
        } else {
          stockUpdate =
            await db
              .collection(
                PRODUCT_COLLECTION
              )
              .updateOne(
                {
                  _id:
                    new ObjectId(
                      productId
                    ),
                },
                {
                  $inc: {
                    stockQuantity:
                      finalQuantity,
                  },

                  $set: {
                    updatedAt:
                      now,
                  },
                },
                { session }
              );
        }

        // ====================================
        // Stock Update Check
        // ====================================

        if (
          stockUpdate.matchedCount === 0
        ) {
          throw new Error(
            "Product stock update করা যায়নি"
          );
        }

        // ====================================
        // Cash Balance Update
        // ====================================

        if (
          finalPaymentMethod ===
            "ক্যাশ" &&
          finalPaidAmount > 0
        ) {
          const existingBalance =
            await db
              .collection(
                CASH_BALANCE_COLLECTION
              )
              .findOne(
                {
                  date:
                    purchaseDateString,
                },
                { session }
              );

          const openingBalance =
            toNumber(
              existingBalance?.openingBalance
            );

          const cashSales =
            toNumber(
              existingBalance?.cashSales
            );

          const existingCashPurchases =
            toNumber(
              existingBalance?.cashPurchases
            );

          const expenses =
            toNumber(
              existingBalance?.expenses
            );

          const newCashPurchases =
            Number(
              (
                existingCashPurchases +
                finalPaidAmount
              ).toFixed(2)
            );

          const closingBalance =
            Number(
              (
                openingBalance +
                cashSales -
                newCashPurchases -
                expenses
              ).toFixed(2)
            );

          await db
            .collection(
              CASH_BALANCE_COLLECTION
            )
            .updateOne(
              {
                date:
                  purchaseDateString,
              },
              {
                $set: {
                  date:
                    purchaseDateString,

                  cashPurchases:
                    newCashPurchases,

                  closingBalance,

                  updatedAt:
                    now,
                },

                $setOnInsert: {
                  openingBalance: 0,
                  cashSales: 0,
                  expenses: 0,
                  createdAt: now,
                },
              },
              {
                upsert: true,
                session,
              }
            );
        }

        // ====================================
        // Created Purchase
        // ====================================

        createdPurchase = {
          _id:
            result.insertedId,

          ...purchase,
        };
      }
    );

    return createdPurchase;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// Pay Purchase Due
//
// নতুন Feature
//
// Example:
//
// Total = 5000
// Initial Paid = 3000
// Due = 2000
//
// Later Pay = 2000
//
// Paid = 5000
// Due = 0
//
// Cash Balance:
// cashPurchases + 2000
// ==========================================

const payPurchaseDue = async (
  id,
  paymentData = {}
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    throw new Error(
      "Invalid Purchase ID"
    );
  }

  const paymentAmount =
    toNumber(
      paymentData.paymentAmount
    );

  if (paymentAmount <= 0) {
    throw new Error(
      "Payment amount 0-এর বেশি হতে হবে"
    );
  }

  const paymentMethod =
    paymentData.paymentMethod?.trim() ||
    "ক্যাশ";

  // ========================================
  // Payment Date
  // ========================================

  const paymentDate =
    paymentData.paymentDate
      ? new Date(
          paymentData.paymentDate
        )
      : new Date();

  if (
    Number.isNaN(
      paymentDate.getTime()
    )
  ) {
    throw new Error(
      "Payment Date সঠিক নয়"
    );
  }

  const paymentDateString =
    getBangladeshDateString(
      paymentDate
    );

  const session =
    db.client.startSession();

  try {
    let updatedPurchase;

    await session.withTransaction(
      async () => {
        // ==================================
        // Find Purchase
        // ==================================

        const purchase =
          await db
            .collection(
              PURCHASE_COLLECTION
            )
            .findOne(
              {
                _id:
                  new ObjectId(id),
              },
              { session }
            );

        if (!purchase) {
          throw new Error(
            "Purchase পাওয়া যায়নি"
          );
        }

        // ==================================
        // Existing Due
        // ==================================

        const totalAmount =
          toNumber(
            purchase.totalAmount
          );

        const existingPaidAmount =
          toNumber(
            purchase.paidAmount
          );

        const existingDueAmount =
          Number(
            (
              purchase.dueAmount !==
              undefined
                ? toNumber(
                    purchase.dueAmount
                  )
                : totalAmount -
                  existingPaidAmount
            ).toFixed(2)
          );

        // ==================================
        // No Due
        // ==================================

        if (
          existingDueAmount <= 0
        ) {
          throw new Error(
            "এই Purchase-এর কোনো due নেই"
          );
        }

        // ==================================
        // Cannot Pay More Than Due
        // ==================================

        if (
          paymentAmount >
          existingDueAmount
        ) {
          throw new Error(
            `Payment amount বাকি due-এর চেয়ে বেশি হতে পারবে না। Current Due: ৳${existingDueAmount}`
          );
        }

        // ==================================
        // New Paid / Due
        // ==================================

        const newPaidAmount =
          Number(
            (
              existingPaidAmount +
              paymentAmount
            ).toFixed(2)
          );

        const newDueAmount =
          Number(
            (
              existingDueAmount -
              paymentAmount
            ).toFixed(2)
          );

        const now =
          new Date();

        // ==================================
        // Update Purchase
        //
        // IMPORTANT:
        // totalAmount change হবে না
        // stock change হবে না
        // product change হবে না
        // ==================================

        const purchaseUpdate =
          await db
            .collection(
              PURCHASE_COLLECTION
            )
            .updateOne(
              {
                _id:
                  new ObjectId(id),

                dueAmount: {
                  $gt: 0,
                },
              },
              {
                $set: {
                  paidAmount:
                    newPaidAmount,

                  dueAmount:
                    newDueAmount,

                  updatedAt:
                    now,
                },
              },
              { session }
            );

        if (
          purchaseUpdate.modifiedCount ===
          0
        ) {
          throw new Error(
            "Purchase due update করা যায়নি"
          );
        }

        // ==================================
        // Cash Balance
        //
        // শুধুমাত্র Cash payment হলে
        // cashPurchases বাড়বে।
        // ==================================

        if (
          paymentMethod ===
            "ক্যাশ"
        ) {
          const existingBalance =
            await db
              .collection(
                CASH_BALANCE_COLLECTION
              )
              .findOne(
                {
                  date:
                    paymentDateString,
                },
                { session }
              );

          const openingBalance =
            toNumber(
              existingBalance?.openingBalance
            );

          const cashSales =
            toNumber(
              existingBalance?.cashSales
            );

          const existingCashPurchases =
            toNumber(
              existingBalance?.cashPurchases
            );

          const expenses =
            toNumber(
              existingBalance?.expenses
            );

          const newCashPurchases =
            Number(
              (
                existingCashPurchases +
                paymentAmount
              ).toFixed(2)
            );

          const closingBalance =
            Number(
              (
                openingBalance +
                cashSales -
                newCashPurchases -
                expenses
              ).toFixed(2)
            );

          await db
            .collection(
              CASH_BALANCE_COLLECTION
            )
            .updateOne(
              {
                date:
                  paymentDateString,
              },
              {
                $set: {
                  date:
                    paymentDateString,

                  cashPurchases:
                    newCashPurchases,

                  closingBalance,

                  updatedAt:
                    now,
                },

                $setOnInsert: {
                  openingBalance: 0,

                  cashSales: 0,

                  expenses: 0,

                  createdAt:
                    now,
                },
              },
              {
                upsert: true,

                session,
              }
            );
        }

        // ==================================
        // Payment History
        //
        // আলাদা collection-এ payment record
        // থাকবে।
        // ==================================

        const paymentHistory = {
          purchaseId:
            new ObjectId(id),

          supplierId:
            purchase.supplierId ||
            null,

          supplierName:
            purchase.supplierName ||
            "",

          invoiceNo:
            purchase.invoiceNo ||
            "",

          paymentAmount,

          paymentMethod,

          paymentDate,

          paymentDateString,

          notes:
            paymentData.notes?.trim() ||
            "",

          createdAt:
            now,
        };

        await db
          .collection(
            "supplierDuePayments"
          )
          .insertOne(
            paymentHistory,
            { session }
          );

        // ==================================
        // Get Updated Purchase
        // ==================================

        updatedPurchase =
          await db
            .collection(
              PURCHASE_COLLECTION
            )
            .findOne(
              {
                _id:
                  new ObjectId(id),
              },
              { session }
            );
      }
    );

    return updatedPurchase;
  } finally {
    await session.endSession();
  }
};

// ==========================================
// Delete Purchase
// ==========================================

const deletePurchase = async (
  id
) => {
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
        // Find Purchase
        // ====================================

        const purchase =
          await db
            .collection(
              PURCHASE_COLLECTION
            )
            .findOne(
              {
                _id:
                  new ObjectId(id),
              },
              { session }
            );

        if (!purchase) {
          throw new Error(
            "Purchase পাওয়া যায়নি"
          );
        }

        // ====================================
        // Find Product
        // ====================================

        const product =
          await db
            .collection(
              PRODUCT_COLLECTION
            )
            .findOne(
              {
                _id:
                  purchase.productId,
              },
              { session }
            );

        if (!product) {
          throw new Error(
            "Purchase-এর Product আর পাওয়া যায়নি"
          );
        }

        const isPoultry =
          purchase.unit ===
          "কেজি + পিস";

        // ====================================
        // Reverse Poultry Stock
        // ====================================

        if (isPoultry) {
          const currentPieces =
            Number(
              product.stockPieces
            ) || 0;

          const currentWeight =
            Number(
              product.totalWeight
            ) || 0;

          const purchasePieces =
            Number(
              purchase.pieces
            ) || 0;

          const purchaseWeight =
            Number(
              purchase.weight
            ) || 0;

          if (
            currentPieces <
            purchasePieces
          ) {
            throw new Error(
              "Purchase delete করলে Pieces stock negative হয়ে যাবে"
            );
          }

          if (
            currentWeight <
            purchaseWeight
          ) {
            throw new Error(
              "Purchase delete করলে Weight stock negative হয়ে যাবে"
            );
          }

          const stockUpdate =
            await db
              .collection(
                PRODUCT_COLLECTION
              )
              .updateOne(
                {
                  _id:
                    purchase.productId,
                },
                {
                  $inc: {
                    stockPieces:
                      -purchasePieces,

                    totalWeight:
                      -purchaseWeight,
                  },

                  $set: {
                    updatedAt:
                      new Date(),
                  },
                },
                { session }
              );

          if (
            stockUpdate.matchedCount ===
            0
          ) {
            throw new Error(
              "Poultry stock reverse করা যায়নি"
            );
          }
        }

        // ====================================
        // Reverse Normal Product Stock
        // ====================================

        else {
          const currentQuantity =
            Number(
              product.stockQuantity
            ) || 0;

          const purchaseQuantity =
            Number(
              purchase.quantity
            ) || 0;

          if (
            currentQuantity <
            purchaseQuantity
          ) {
            throw new Error(
              "Purchase delete করলে stock negative হয়ে যাবে"
            );
          }

          const stockUpdate =
            await db
              .collection(
                PRODUCT_COLLECTION
              )
              .updateOne(
                {
                  _id:
                    purchase.productId,
                },
                {
                  $inc: {
                    stockQuantity:
                      -purchaseQuantity,
                  },

                  $set: {
                    updatedAt:
                      new Date(),
                  },
                },
                { session }
              );

          if (
            stockUpdate.matchedCount ===
            0
          ) {
            throw new Error(
              "Product stock reverse করা যায়নি"
            );
          }
        }

        // ====================================
        // Reverse Cash Balance
        // ====================================

        const purchasePaymentMethod =
          purchase.paymentMethod ||
          "ক্যাশ";

        const purchasePaidAmount =
          toNumber(
            purchase.paidAmount
          );

        if (
          purchasePaymentMethod ===
            "ক্যাশ" &&
          purchasePaidAmount > 0
        ) {
          const purchaseDate =
            purchase.purchaseDate
              ? new Date(
                  purchase.purchaseDate
                )
              : new Date();

          const purchaseDateString =
            getBangladeshDateString(
              purchaseDate
            );

          const cashBalance =
            await db
              .collection(
                CASH_BALANCE_COLLECTION
              )
              .findOne(
                {
                  date:
                    purchaseDateString,
                },
                { session }
              );

          if (!cashBalance) {
            throw new Error(
              "Purchase-এর Cash Balance পাওয়া যায়নি"
            );
          }

          const currentCashPurchases =
            toNumber(
              cashBalance.cashPurchases
            );

          if (
            currentCashPurchases <
            purchasePaidAmount
          ) {
            throw new Error(
              "Purchase delete করলে Cash Purchase balance negative হয়ে যাবে"
            );
          }

          const newCashPurchases =
            Number(
              (
                currentCashPurchases -
                purchasePaidAmount
              ).toFixed(2)
            );

          const openingBalance =
            toNumber(
              cashBalance.openingBalance
            );

          const cashSales =
            toNumber(
              cashBalance.cashSales
            );

          const expenses =
            toNumber(
              cashBalance.expenses
            );

          const newClosingBalance =
            Number(
              (
                openingBalance +
                cashSales -
                newCashPurchases -
                expenses
              ).toFixed(2)
            );

          await db
            .collection(
              CASH_BALANCE_COLLECTION
            )
            .updateOne(
              {
                date:
                  purchaseDateString,
              },
              {
                $set: {
                  cashPurchases:
                    newCashPurchases,

                  closingBalance:
                    newClosingBalance,

                  updatedAt:
                    new Date(),
                },
              },
              { session }
            );
        }

        // ====================================
        // Delete Due Payment History
        //
        // Purchase delete হলে related
        // due payment history-ও delete হবে।
        // ====================================

        await db
          .collection(
            "supplierDuePayments"
          )
          .deleteMany(
            {
              purchaseId:
                new ObjectId(id),
            },
            { session }
          );

        // ====================================
        // Delete Purchase
        // ====================================

        const result =
          await db
            .collection(
              PURCHASE_COLLECTION
            )
            .deleteOne(
              {
                _id:
                  new ObjectId(id),
              },
              { session }
            );

        if (
          result.deletedCount === 0
        ) {
          throw new Error(
            "Purchase delete করা যায়নি"
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
  getPurchases,
  getPurchaseById,
  createPurchase,
  payPurchaseDue,
  deletePurchase,
};