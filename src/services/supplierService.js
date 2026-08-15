const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");

const COLLECTION_NAME = "suppliers";

const PURCHASE_COLLECTION =
  "purchases";

const SUPPLIER_PAYMENT_COLLECTION =
  "supplierPayments";

const CASH_BALANCE_COLLECTION =
  "cashBalances";

// =====================================
// Helper
// =====================================

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

// =====================================
// Bangladesh Date
// =====================================

const getBangladeshDateString = (
  inputDate
) => {
  const date = inputDate
    ? new Date(inputDate)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      "Date সঠিক নয়"
    );
  }

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

// =====================================
// সব Supplier
// =====================================

const getSuppliers = async () => {
  const db = getDB();

  const suppliers =
    await db
      .collection(COLLECTION_NAME)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

  // ===================================
  // প্রতিটি Supplier-এর Due যোগ করা
  // ===================================

  const result = [];

  for (const supplier of suppliers) {
    const due =
      await calculateSupplierDue(
        supplier._id
      );

    result.push({
      ...supplier,

      totalPurchaseAmount:
        due.totalPurchaseAmount,

      totalPaidAmount:
        due.totalPaidAmount,

      totalPurchaseDue:
        due.totalPurchaseDue,

      totalSupplierPayment:
        due.totalSupplierPayment,

      currentDue:
        due.currentDue,
    });
  }

  return result;
};

// =====================================
// একটি Supplier
// =====================================

const getSupplierById = async (
  id
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const supplier =
    await db
      .collection(COLLECTION_NAME)
      .findOne({
        _id: new ObjectId(id),
      });

  if (!supplier) {
    return null;
  }

  const due =
    await calculateSupplierDue(
      new ObjectId(id)
    );

  return {
    ...supplier,

    totalPurchaseAmount:
      due.totalPurchaseAmount,

    totalPaidAmount:
      due.totalPaidAmount,

    totalPurchaseDue:
      due.totalPurchaseDue,

    totalSupplierPayment:
      due.totalSupplierPayment,

    currentDue:
      due.currentDue,
  };
};

// =====================================
// Supplier Due Calculate
//
// IMPORTANT:
//
// এখন Supplier-এর Current Due
// সরাসরি Purchase collection-এর
// actual dueAmount থেকে calculate হবে।
//
// কারণ Supplier Payment করার সময়
// purchases.paidAmount এবং
// purchases.dueAmount update হচ্ছে।
//
// তাই আবার Supplier Payment বাদ দিলে
// double deduction হবে।
// =====================================

const calculateSupplierDue =
  async (supplierId) => {
    const db = getDB();

    // =================================
    // Purchase Summary
    // =================================

    const purchaseSummary =
      await db
        .collection(
          PURCHASE_COLLECTION
        )
        .aggregate([
          {
            $match: {
              supplierId:
                supplierId,
            },
          },

          {
            $group: {
              _id: null,

              totalPurchaseAmount: {
                $sum: {
                  $ifNull: [
                    "$totalAmount",
                    0,
                  ],
                },
              },

              totalPaidAmount: {
                $sum: {
                  $ifNull: [
                    "$paidAmount",
                    0,
                  ],
                },
              },

              totalPurchaseDue: {
                $sum: {
                  $ifNull: [
                    "$dueAmount",
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray();

    const purchase =
      purchaseSummary[0] || {};

    // =================================
    // Supplier Payment Summary
    //
    // History/reporting purpose only.
    //
    // এটি currentDue থেকে বাদ যাবে না।
    // =================================

    const paymentSummary =
      await db
        .collection(
          SUPPLIER_PAYMENT_COLLECTION
        )
        .aggregate([
          {
            $match: {
              supplierId:
                supplierId,
            },
          },

          {
            $group: {
              _id: null,

              totalSupplierPayment: {
                $sum: {
                  $ifNull: [
                    "$amount",
                    0,
                  ],
                },
              },
            },
          },
        ])
        .toArray();

    const payment =
      paymentSummary[0] || {};

    const totalPurchaseAmount =
      Number(
        (
          toNumber(
            purchase.totalPurchaseAmount
          )
        ).toFixed(2)
      );

    const totalPaidAmount =
      Number(
        (
          toNumber(
            purchase.totalPaidAmount
          )
        ).toFixed(2)
      );

    const totalPurchaseDue =
      Number(
        (
          toNumber(
            purchase.totalPurchaseDue
          )
        ).toFixed(2)
      );

    const totalSupplierPayment =
      Number(
        (
          toNumber(
            payment.totalSupplierPayment
          )
        ).toFixed(2)
      );

    // =================================
    // Current Due
    //
    // IMPORTANT:
    //
    // Purchase-এর dueAmount already
    // payment অনুযায়ী কমে গেছে।
    //
    // তাই:
    //
    // currentDue = totalPurchaseDue
    //
    // আবার totalSupplierPayment বাদ
    // দেওয়া যাবে না।
    // =================================

    const currentDue =
      Math.max(
        0,
        Number(
          totalPurchaseDue.toFixed(2)
        )
      );

    return {
      totalPurchaseAmount,
      totalPaidAmount,
      totalPurchaseDue,
      totalSupplierPayment,
      currentDue,
    };
  };

// =====================================
// Supplier তৈরি
// =====================================

const createSupplier = async (
  supplierData
) => {
  const db = getDB();

  const name =
    supplierData.name?.trim();

  if (!name) {
    throw new Error(
      "সরবরাহকারী/খামারের নাম আবশ্যক"
    );
  }

  // ===================================
  // একই নামের Supplier আছে কিনা
  // ===================================

  const existingSupplier =
    await db
      .collection(COLLECTION_NAME)
      .findOne({
        name,
      });

  if (existingSupplier) {
    throw new Error(
      "এই নামে একটি সরবরাহকারী ইতিমধ্যে আছে"
    );
  }

  const now = new Date();

  const supplier = {
    name,

    type:
      supplierData.type ||
      "অন্যান্য",

    contactPerson:
      supplierData.contactPerson?.trim() ||
      "",

    phone:
      supplierData.phone?.trim() ||
      "",

    email:
      supplierData.email?.trim() ||
      "",

    address:
      supplierData.address?.trim() ||
      "",

    notes:
      supplierData.notes?.trim() ||
      "",

    status:
      supplierData.status ||
      "সক্রিয়",

    createdAt: now,

    updatedAt: now,
  };

  const result =
    await db
      .collection(COLLECTION_NAME)
      .insertOne(supplier);

  return {
    _id: result.insertedId,
    ...supplier,

    totalPurchaseAmount: 0,
    totalPaidAmount: 0,
    totalPurchaseDue: 0,
    totalSupplierPayment: 0,
    currentDue: 0,
  };
};

// =====================================
// Supplier Update
// =====================================

const updateSupplier = async (
  id,
  supplierData
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const objectId =
    new ObjectId(id);

  const name =
    supplierData.name?.trim();

  if (!name) {
    throw new Error(
      "সরবরাহকারী/খামারের নাম আবশ্যক"
    );
  }

  // ===================================
  // অন্য Supplier-এর একই নাম
  // ===================================

  const existingSupplier =
    await db
      .collection(COLLECTION_NAME)
      .findOne({
        name,

        _id: {
          $ne: objectId,
        },
      });

  if (existingSupplier) {
    throw new Error(
      "এই নামে একটি সরবরাহকারী ইতিমধ্যে আছে"
    );
  }

  const updatedSupplier = {
    name,

    type:
      supplierData.type ||
      "অন্যান্য",

    contactPerson:
      supplierData.contactPerson?.trim() ||
      "",

    phone:
      supplierData.phone?.trim() ||
      "",

    email:
      supplierData.email?.trim() ||
      "",

    address:
      supplierData.address?.trim() ||
      "",

    notes:
      supplierData.notes?.trim() ||
      "",

    status:
      supplierData.status ||
      "সক্রিয়",

    updatedAt:
      new Date(),
  };

  const result =
    await db
      .collection(COLLECTION_NAME)
      .updateOne(
        {
          _id: objectId,
        },
        {
          $set:
            updatedSupplier,
        }
      );

  if (
    result.matchedCount === 0
  ) {
    return null;
  }

  return await getSupplierById(id);
};

// =====================================
// Supplier Delete
// =====================================

const deleteSupplier = async (
  id
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const objectId =
    new ObjectId(id);

  // ===================================
  // Purchase আছে কিনা
  // ===================================

  const purchaseExists =
    await db
      .collection(
        PURCHASE_COLLECTION
      )
      .findOne({
        supplierId:
          objectId,
      });

  if (purchaseExists) {
    throw new Error(
      "এই Supplier-এর Purchase history আছে, তাই Supplier delete করা যাবে না"
    );
  }

  // ===================================
  // Payment history আছে কিনা
  // ===================================

  const paymentExists =
    await db
      .collection(
        SUPPLIER_PAYMENT_COLLECTION
      )
      .findOne({
        supplierId:
          objectId,
      });

  if (paymentExists) {
    throw new Error(
      "এই Supplier-এর Payment history আছে, তাই Supplier delete করা যাবে না"
    );
  }

  const result =
    await db
      .collection(COLLECTION_NAME)
      .deleteOne({
        _id: objectId,
      });

  return (
    result.deletedCount > 0
  );
};

// =====================================
// Get Supplier Due
// =====================================

const getSupplierDue = async (
  id
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const supplier =
    await db
      .collection(COLLECTION_NAME)
      .findOne({
        _id:
          new ObjectId(id),
      });

  if (!supplier) {
    return null;
  }

  const due =
    await calculateSupplierDue(
      new ObjectId(id)
    );

  return {
    supplierId:
      supplier._id,

    supplierName:
      supplier.name,

    ...due,
  };
};

// =====================================
// Supplier Due Payment
//
// IMPORTANT:
//
// Supplier Management থেকে payment
// করলে পুরোনো outstanding Purchase
// আগে adjust হবে (FIFO).
//
// Example:
//
// Purchase A Due = 2000
// Purchase B Due = 5000
//
// Payment = 4000
//
// A → Due 0
// B → Due 3000
//
// Supplier Current Due = 3000
//
// Cash হলে cashPurchases শুধু
// payment amount অনুযায়ী একবার বাড়বে।
// =====================================

const paySupplierDue = async ({
  supplierId,
  amount,
  paymentMethod,
  date,
  notes,
}) => {
  const db = getDB();

  if (
    !ObjectId.isValid(
      supplierId
    )
  ) {
    throw new Error(
      "Invalid Supplier ID"
    );
  }

  const objectSupplierId =
    new ObjectId(supplierId);

  const numericAmount =
    toNumber(amount);

  if (
    numericAmount <= 0
  ) {
    throw new Error(
      "Payment amount অবশ্যই 0-এর বেশি হতে হবে"
    );
  }

  // ===================================
  // Supplier Check
  // ===================================

  const supplier =
    await db
      .collection(COLLECTION_NAME)
      .findOne({
        _id:
          objectSupplierId,
      });

  if (!supplier) {
    throw new Error(
      "সরবরাহকারী পাওয়া যায়নি"
    );
  }

  // ===================================
  // Current Due
  // ===================================

  const due =
    await calculateSupplierDue(
      objectSupplierId
    );

  if (
    due.currentDue <= 0
  ) {
    throw new Error(
      "এই Supplier-এর কোনো outstanding Due নেই"
    );
  }

  if (
    numericAmount >
    due.currentDue
  ) {
    throw new Error(
      `Payment amount current Due (${due.currentDue})-এর চেয়ে বেশি হতে পারবে না`
    );
  }

  // ===================================
  // Payment Method
  // ===================================

  const finalPaymentMethod =
    paymentMethod?.trim() ||
    "ক্যাশ";

  // ===================================
  // Payment Date
  // ===================================

  const paymentDate = date
    ? new Date(date)
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

  // ===================================
  // Transaction
  // ===================================

  const session =
    db.client.startSession();

  try {
    let createdPayment;

    await session.withTransaction(
      async () => {
        const now =
          new Date();

        // =================================
        // Re-check Supplier
        // =================================

        const transactionSupplier =
          await db
            .collection(
              COLLECTION_NAME
            )
            .findOne(
              {
                _id:
                  objectSupplierId,
              },
              {
                session,
              }
            );

        if (!transactionSupplier) {
          throw new Error(
            "সরবরাহকারী পাওয়া যায়নি"
          );
        }

        // =================================
        // Get Outstanding Purchases
        //
        // FIFO:
        //
        // oldest Purchase আগে payment হবে.
        // =================================

        const outstandingPurchases =
          await db
            .collection(
              PURCHASE_COLLECTION
            )
            .find(
              {
                supplierId:
                  objectSupplierId,

                dueAmount: {
                  $gt: 0,
                },
              },
              {
                session,
              }
            )
            .sort({
              purchaseDate: 1,
              createdAt: 1,
              _id: 1,
            })
            .toArray();

        // =================================
        // Outstanding Due Check
        // =================================

        const transactionCurrentDue =
          Number(
            outstandingPurchases
              .reduce(
                (
                  total,
                  purchase
                ) =>
                  total +
                  toNumber(
                    purchase.dueAmount
                  ),
                0
              )
              .toFixed(2)
          );

        if (
          transactionCurrentDue <=
          0
        ) {
          throw new Error(
            "এই Supplier-এর কোনো outstanding Due নেই"
          );
        }

        if (
          numericAmount >
          transactionCurrentDue
        ) {
          throw new Error(
            `Payment amount current Due (${transactionCurrentDue})-এর চেয়ে বেশি হতে পারবে না`
          );
        }

        // =================================
        // Allocate Payment to Purchases
        // =================================

        let remainingPayment =
          Number(
            numericAmount.toFixed(2)
          );

        const purchaseAllocations =
          [];

        for (
          const purchase of
            outstandingPurchases
        ) {
          if (
            remainingPayment <=
            0
          ) {
            break;
          }

          const purchaseDue =
            Number(
              toNumber(
                purchase.dueAmount
              ).toFixed(2)
            );

          if (
            purchaseDue <= 0
          ) {
            continue;
          }

          const allocatedAmount =
            Number(
              Math.min(
                remainingPayment,
                purchaseDue
              ).toFixed(2)
            );

          const existingPaidAmount =
            Number(
              toNumber(
                purchase.paidAmount
              ).toFixed(2)
            );

          const newPaidAmount =
            Number(
              (
                existingPaidAmount +
                allocatedAmount
              ).toFixed(2)
            );

          const newDueAmount =
            Number(
              (
                purchaseDue -
                allocatedAmount
              ).toFixed(2)
            );

          // =================================
          // Purchase Update
          // =================================

          const purchaseUpdate =
            await db
              .collection(
                PURCHASE_COLLECTION
              )
              .updateOne(
                {
                  _id:
                    purchase._id,

                  supplierId:
                    objectSupplierId,

                  dueAmount: {
                    $gte:
                      allocatedAmount,
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
                {
                  session,
                }
              );

          if (
            purchaseUpdate.modifiedCount ===
            0
          ) {
            throw new Error(
              "Purchase due update করা যায়নি। আবার চেষ্টা করুন।"
            );
          }

          // =================================
          // Allocation History
          // =================================

          purchaseAllocations.push({
            purchaseId:
              purchase._id,

            invoiceNo:
              purchase.invoiceNo ||
              "",

            purchaseDate:
              purchase.purchaseDate ||
              null,

            productId:
              purchase.productId ||
              null,

            productName:
              purchase.productName ||
              "",

            totalAmount:
              Number(
                toNumber(
                  purchase.totalAmount
                ).toFixed(2)
              ),

            previousPaidAmount:
              existingPaidAmount,

            previousDueAmount:
              purchaseDue,

            allocatedAmount:
              allocatedAmount,

            newPaidAmount:
              newPaidAmount,

            newDueAmount:
              newDueAmount,
          });

          remainingPayment =
            Number(
              (
                remainingPayment -
                allocatedAmount
              ).toFixed(2)
            );
        }

        // =================================
        // Allocation Check
        // =================================

        if (
          remainingPayment >
          0.009
        ) {
          throw new Error(
            "সম্পূর্ণ payment Purchase-এর due-এর সাথে adjust করা যায়নি"
          );
        }

        // =================================
        // Supplier Payment Document
        // =================================

        const payment = {
          supplierId:
            objectSupplierId,

          supplierName:
            transactionSupplier.name,

          amount:
            Number(
              numericAmount.toFixed(
                2
              )
            ),

          paymentMethod:
            finalPaymentMethod,

          paymentDate:
            paymentDate,

          paymentDateString:
            paymentDateString,

          notes:
            notes?.trim() || "",

          // =================================
          // Which Purchases were adjusted
          // =================================

          purchaseAllocations,

          createdAt:
            now,

          updatedAt:
            now,
        };

        const paymentResult =
          await db
            .collection(
              SUPPLIER_PAYMENT_COLLECTION
            )
            .insertOne(
              payment,
              {
                session,
              }
            );

        // =================================
        // Cash Balance Update
        //
        // শুধুমাত্র Cash payment হলে
        // cashPurchases বাড়বে।
        //
        // Purchase-এর paidAmount update
        // করার জন্য এখানে আবার কোনো
        // আলাদা cash deduction হবে না।
        //
        // তাই double count হবে না।
        // =================================

        if (
          finalPaymentMethod ===
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
                {
                  session,
                }
              );

          const openingBalance =
            toNumber(
              existingBalance?.openingBalance
            );

          const cashSales =
            toNumber(
              existingBalance?.cashSales
            );

          const cashPurchases =
            toNumber(
              existingBalance?.cashPurchases
            );

          const existingExpenses =
            toNumber(
              existingBalance?.expenses
            );

          /*
            Supplier Due Payment
            = Cash Outflow

            তাই cashPurchases-এর মধ্যে
            payment amount একবার add হবে।
          */

          const newCashPurchases =
            Number(
              (
                cashPurchases +
                numericAmount
              ).toFixed(2)
            );

          const newClosingBalance =
            Number(
              (
                openingBalance +
                cashSales -
                newCashPurchases -
                existingExpenses
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

                  closingBalance:
                    newClosingBalance,

                  updatedAt:
                    now,
                },

                $setOnInsert: {
                  openingBalance:
                    0,

                  cashSales:
                    0,

                  expenses:
                    0,

                  createdAt:
                    now,
                },
              },
              {
                upsert:
                  true,

                session,
              }
            );
        }

        createdPayment = {
          _id:
            paymentResult.insertedId,

          ...payment,
        };
      }
    );

    // ===================================
    // Updated Due
    //
    // এখন Purchase collection-এর
    // actual due থেকে calculate হবে।
    // ===================================

    const updatedDue =
      await calculateSupplierDue(
        objectSupplierId
      );

    return {
      ...createdPayment,

      remainingDue:
        updatedDue.currentDue,
    };
  } finally {
    await session.endSession();
  }
};

// =====================================
// Supplier Payment History
// =====================================

const getSupplierPaymentHistory =
  async (id) => {
    const db = getDB();

    if (!ObjectId.isValid(id)) {
      return [];
    }

    return await db
      .collection(
        SUPPLIER_PAYMENT_COLLECTION
      )
      .find({
        supplierId:
          new ObjectId(id),
      })
      .sort({
        paymentDate: -1,
        createdAt: -1,
      })
      .toArray();
  };

// =====================================
// Export
// =====================================

module.exports = {
  getSuppliers,
  getSupplierById,

  createSupplier,
  updateSupplier,
  deleteSupplier,

  getSupplierDue,
  paySupplierDue,
  getSupplierPaymentHistory,
};