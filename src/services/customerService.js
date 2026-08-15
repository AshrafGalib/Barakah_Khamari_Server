const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const cashBalanceService = require("./cashBalanceService");

const COLLECTION_NAME = "customers";
const SALES_COLLECTION_NAME = "sales";

// =====================================
// Generate Customer Code
// =====================================

const generateCustomerCode = async () => {
  const db = getDB();

  const lastCustomer = await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ customerNumber: -1 })
    .limit(1)
    .toArray();

  const nextNumber =
    lastCustomer.length > 0
      ? (lastCustomer[0].customerNumber || 0) + 1
      : 1;

  return {
    customerNumber: nextNumber,
    customerCode: `Customer ${String(
      nextNumber
    ).padStart(3, "0")}`,
  };
};

// =====================================
// সব Customer
// =====================================

const getCustomers = async () => {
  const db = getDB();

  return await db
    .collection(COLLECTION_NAME)
    .find({})
    .sort({ createdAt: -1 })
    .toArray();
};

// =====================================
// একটি Customer
// =====================================

const getCustomerById = async (id) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  return await db
    .collection(COLLECTION_NAME)
    .findOne({
      _id: new ObjectId(id),
    });
};

// =====================================
// Customer তৈরি
// =====================================

const createCustomer = async (customerData) => {
  const db = getDB();

  const paymentType =
    customerData.paymentType || "নগদ";

  const isDueCustomer =
    paymentType === "বাকি";

  // ===================================
  // Due Customer
  // ===================================

  if (isDueCustomer) {
    const name =
      customerData.name?.trim();

    if (!name) {
      throw new Error(
        "বাকি customer-এর নাম আবশ্যক"
      );
    }

    const phone =
      customerData.phone?.trim() || "";

    const existingCustomer =
      await db
        .collection(COLLECTION_NAME)
        .findOne({
          name,
          phone,
          customerType: "due",
        });

    if (existingCustomer) {
      return existingCustomer;
    }

    const customer = {
      customerCode:
        `DUE-${Date.now()}`,

      customerNumber: null,

      customerType: "due",

      paymentType: "বাকি",

      name,

      phone,

      address:
        customerData.address?.trim() || "",

      totalPurchase:
        Number(
          customerData.totalPurchase
        ) || 0,

      paidAmount:
        Number(
          customerData.paidAmount
        ) || 0,

      dueAmount:
        Number(
          customerData.dueAmount
        ) || 0,

      notes:
        customerData.notes?.trim() || "",

      status:
        customerData.status || "সক্রিয়",

      createdAt: new Date(),

      updatedAt: new Date(),
    };

    const result =
      await db
        .collection(COLLECTION_NAME)
        .insertOne(customer);

    return {
      _id: result.insertedId,
      ...customer,
    };
  }

  // ===================================
  // Cash / Nagad Customer
  // ===================================

  const {
    customerNumber,
    customerCode,
  } = await generateCustomerCode();

  const customer = {
    customerCode,

    customerNumber,

    customerType: "regular",

    paymentType,

    name: customerCode,

    phone: "",

    address: "",

    totalPurchase:
      Number(
        customerData.totalPurchase
      ) || 0,

    paidAmount:
      Number(
        customerData.paidAmount
      ) || 0,

    dueAmount: 0,

    notes: "",

    status: "সক্রিয়",

    createdAt: new Date(),

    updatedAt: new Date(),
  };

  const result =
    await db
      .collection(COLLECTION_NAME)
      .insertOne(customer);

  return {
    _id: result.insertedId,
    ...customer,
  };
};

// =====================================
// Customer Update
// =====================================

const updateCustomer = async (
  id,
  customerData
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return null;
  }

  const objectId =
    new ObjectId(id);

  const existingCustomer =
    await getCustomerById(id);

  if (!existingCustomer) {
    return null;
  }

  const updatedCustomer = {};

  // ===================================
  // Due Customer Info Update
  // ===================================

  if (
    existingCustomer.customerType ===
    "due"
  ) {
    if (
      customerData.name !== undefined
    ) {
      const name =
        customerData.name.trim();

      if (!name) {
        throw new Error(
          "Customer-এর নাম আবশ্যক"
        );
      }

      updatedCustomer.name = name;
    }

    if (
      customerData.phone !== undefined
    ) {
      updatedCustomer.phone =
        customerData.phone.trim();
    }

    if (
      customerData.address !== undefined
    ) {
      updatedCustomer.address =
        customerData.address.trim();
    }

    if (
      customerData.notes !== undefined
    ) {
      updatedCustomer.notes =
        customerData.notes.trim();
    }
  }

  // ===================================
  // Common Fields
  // ===================================

  if (
    customerData.status !== undefined
  ) {
    updatedCustomer.status =
      customerData.status;
  }

  if (
    customerData.totalPurchase !==
    undefined
  ) {
    updatedCustomer.totalPurchase =
      Number(
        customerData.totalPurchase
      ) || 0;
  }

  if (
    customerData.paidAmount !== undefined
  ) {
    updatedCustomer.paidAmount =
      Number(
        customerData.paidAmount
      ) || 0;
  }

  if (
    customerData.dueAmount !== undefined
  ) {
    updatedCustomer.dueAmount =
      Number(
        customerData.dueAmount
      ) || 0;
  }

  updatedCustomer.updatedAt =
    new Date();

  const result =
    await db
      .collection(COLLECTION_NAME)
      .updateOne(
        {
          _id: objectId,
        },
        {
          $set: updatedCustomer,
        }
      );

  if (result.matchedCount === 0) {
    return null;
  }

  return await getCustomerById(id);
};

// =====================================
// Customer Due Payment
// =====================================
//
// Customer Management page থেকে
// outstanding due payment করলে:
//
// 1. Customer dueAmount কমবে
// 2. Customer paidAmount বাড়বে
// 3. Related Sales-এর paidAmount বাড়বে
// 4. Related Sales-এর dueAmount কমবে
// 5. Cash Balance-এ cash inflow হবে
// 6. Dashboard-এর Sales Paid/Due automatically update হবে
// 7. সবকিছু একই MongoDB transaction-এর
//    মধ্যে হবে
//
// =====================================

const payCustomerDue = async (
  id,
  paymentData = {}
) => {
  const db = getDB();

  // ===================================
  // Validate Customer ID
  // ===================================

  if (!ObjectId.isValid(id)) {
    throw new Error(
      "Invalid Customer ID"
    );
  }

  // ===================================
  // Payment Amount
  // ===================================

  const paymentAmount =
    Number(paymentData.amount);

  if (
    !Number.isFinite(paymentAmount)
  ) {
    throw new Error(
      "Payment Amount সঠিক নয়"
    );
  }

  if (paymentAmount <= 0) {
    throw new Error(
      "Payment Amount 0-এর বেশি হতে হবে"
    );
  }

  // ===================================
  // Start MongoDB Transaction
  // ===================================

  const session =
    db.client.startSession();

  try {
    let updatedCustomer = null;

    await session.withTransaction(
      async () => {

        // ===============================
        // Find Customer
        // ===============================

        const customer =
          await db
            .collection(COLLECTION_NAME)
            .findOne(
              {
                _id: new ObjectId(id),
              },
              {
                session,
              }
            );

        if (!customer) {
          throw new Error(
            "Customer পাওয়া যায়নি"
          );
        }

        // ===============================
        // Current Due
        // ===============================

        const currentDue =
          Number(
            customer.dueAmount
          ) || 0;

        if (currentDue <= 0) {
          throw new Error(
            "এই Customer-এর কোনো Due নেই"
          );
        }

        // ===============================
        // Payment Cannot Exceed Due
        // ===============================

        if (
          paymentAmount >
          currentDue
        ) {
          throw new Error(
            "Payment Amount Customer-এর Due-এর চেয়ে বেশি হতে পারবে না"
          );
        }

        // ===============================
        // Find Outstanding Sales
        //
        // Oldest due sale first
        // ===============================

        const outstandingSales =
          await db
            .collection(
              SALES_COLLECTION_NAME
            )
            .find(
              {
                customerId:
                  new ObjectId(id),

                dueAmount: {
                  $gt: 0,
                },
              },
              {
                session,
              }
            )
            .sort({
              saleDate: 1,
              createdAt: 1,
              _id: 1,
            })
            .toArray();

        // ===============================
        // Calculate Total Sales Due
        // ===============================

        const totalSalesDue =
          outstandingSales.reduce(
            (total, sale) => {
              return (
                total +
                (
                  Number(
                    sale.dueAmount
                  ) || 0
                )
              );
            },
            0
          );

        const roundedTotalSalesDue =
          Number(
            totalSalesDue.toFixed(2)
          );

        // ===============================
        // Safety Check
        //
        // Customer Due এবং Sales Due-এর
        // মধ্যে mismatch থাকলে transaction
        // চালানো হবে না।
        // ===============================

        if (
          roundedTotalSalesDue <
          paymentAmount
        ) {
          throw new Error(
            "Customer Due এবং Sales Due-এর হিসাবের মধ্যে অসামঞ্জস্য রয়েছে। Payment করা যায়নি।"
          );
        }

        // ===============================
        // Remaining Payment
        // ===============================

        let remainingPayment =
          paymentAmount;

        // ===============================
        // Update Sales
        //
        // Oldest sale থেকে payment
        // distribute হবে।
        // ===============================

        for (
          const sale
          of outstandingSales
        ) {
          if (
            remainingPayment <= 0
          ) {
            break;
          }

          const saleDue =
            Number(
              sale.dueAmount
            ) || 0;

          if (saleDue <= 0) {
            continue;
          }

          const paymentForSale =
            Math.min(
              remainingPayment,
              saleDue
            );

          const newSaleDue =
            Number(
              (
                saleDue -
                paymentForSale
              ).toFixed(2)
            );

          const currentSalePaid =
            Number(
              sale.paidAmount
            ) || 0;

          const newSalePaid =
            Number(
              (
                currentSalePaid +
                paymentForSale
              ).toFixed(2)
            );

          const saleUpdate =
            await db
              .collection(
                SALES_COLLECTION_NAME
              )
              .updateOne(
                {
                  _id: sale._id,

                  dueAmount: {
                    $gte:
                      paymentForSale,
                  },
                },
                {
                  $set: {
                    paidAmount:
                      newSalePaid,

                    dueAmount:
                      newSaleDue,

                    updatedAt:
                      new Date(),
                  },
                },
                {
                  session,
                }
              );

          if (
            saleUpdate.matchedCount ===
            0
          ) {
            throw new Error(
              "Sales record update করা যায়নি"
            );
          }

          remainingPayment =
            Number(
              (
                remainingPayment -
                paymentForSale
              ).toFixed(2)
            );
        }

        // ===============================
        // Safety Check
        // ===============================

        if (
          remainingPayment > 0
        ) {
          throw new Error(
            "Payment-এর সম্পূর্ণ amount Sales record-এ adjust করা যায়নি"
          );
        }

        // ===============================
        // Calculate New Customer Due
        // ===============================

        const newDue =
          Number(
            (
              currentDue -
              paymentAmount
            ).toFixed(2)
          );

        // ===============================
        // Calculate New Customer Paid
        // ===============================

        const currentPaid =
          Number(
            customer.paidAmount
          ) || 0;

        const newPaid =
          Number(
            (
              currentPaid +
              paymentAmount
            ).toFixed(2)
          );

        const now =
          new Date();

        // ===============================
        // Update Customer
        // ===============================

        const customerUpdate =
          await db
            .collection(
              COLLECTION_NAME
            )
            .updateOne(
              {
                _id:
                  new ObjectId(id),
              },
              {
                $set: {
                  paidAmount:
                    newPaid,

                  dueAmount:
                    newDue,

                  status:
                    newDue === 0
                      ? "পরিশোধিত"
                      : "সক্রিয়",

                  updatedAt:
                    now,
                },
              },
              {
                session,
              }
            );

        if (
          customerUpdate.matchedCount ===
          0
        ) {
          throw new Error(
            "Customer update করা যায়নি"
          );
        }

        // ===============================
        // Bangladesh Date
        // ===============================

        const cashDate =
          cashBalanceService
            .getBangladeshDateString(
              now
            );

        // ===============================
        // Due Payment = Cash Inflow
        // ===============================

        await cashBalanceService
          .updateCashSales(
            cashDate,
            paymentAmount,
            session
          );

        // ===============================
        // Updated Customer
        // ===============================

        updatedCustomer = {
          ...customer,

          paidAmount:
            newPaid,

          dueAmount:
            newDue,

          status:
            newDue === 0
              ? "পরিশোধিত"
              : "সক্রিয়",

          updatedAt:
            now,
        };
      }
    );

    return updatedCustomer;

  } finally {
    await session.endSession();
  }
};

// =====================================
// Customer Delete
// =====================================

const deleteCustomer = async (
  id
) => {
  const db = getDB();

  if (!ObjectId.isValid(id)) {
    return false;
  }

  const result =
    await db
      .collection(COLLECTION_NAME)
      .deleteOne({
        _id: new ObjectId(id),
      });

  return result.deletedCount > 0;
};

// =====================================
// Export
// =====================================

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  payCustomerDue,
  deleteCustomer,
};