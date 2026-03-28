const prisma = require('../utils/db');

// Get all customers
const getAllCustomers = async () => {
  try {
    return await prisma.customer.findMany();
  } catch (error) {
    throw new Error(`Error fetching customers: ${error.message}`);
  }
};

// Get customer by ID
const getCustomerById = async (customerid) => {
  try {
    return await prisma.customer.findUnique({
      where: { customerid },
    });
  } catch (error) {
    throw new Error(`Error fetching customer: ${error.message}`);
  }
};

// Get customer by email
const getCustomerByEmail = async (emailadd) => {
  try {
    return await prisma.customer.findUnique({
      where: { emailadd },
    });
  } catch (error) {
    throw new Error(`Error fetching customer by email: ${error.message}`);
  }
};

// Create a new customer
const createCustomer = async (customerData) => {
  try {
    return await prisma.customer.create({
      data: {
        customerid: customerData.customerid,
        firstname: customerData.firstname,
        lastname: customerData.lastname || null,
        emailadd: customerData.emailadd,
        contactnum: customerData.contactnum || null,
        addressline1: customerData.addressline1,
        addressline2: customerData.addressline2 || null,
        city: customerData.city,
        pincode: customerData.pincode,
        gender: customerData.gender || null,
        dob: new Date(customerData.dob),
        isloyalty: customerData.isloyalty || false,
        sysenrollmentdt: new Date(),
        syslastmodifieddt: new Date(),
      },
    });
  } catch (error) {
    throw new Error(`Error creating customer: ${error.message}`);
  }
};

// Update customer
const updateCustomer = async (customerid, customerData) => {
  try {
    return await prisma.customer.update({
      where: { customerid },
      data: {
        firstname: customerData.firstname,
        lastname: customerData.lastname,
        contactnum: customerData.contactnum,
        addressline1: customerData.addressline1,
        addressline2: customerData.addressline2,
        city: customerData.city,
        pincode: customerData.pincode,
        gender: customerData.gender,
        dob: customerData.dob ? new Date(customerData.dob) : undefined,
        isloyalty: customerData.isloyalty,
        syslastmodifieddt: new Date(),
      },
    });
  } catch (error) {
    throw new Error(`Error updating customer: ${error.message}`);
  }
};

// Delete customer
const deleteCustomer = async (customerid) => {
  try {
    return await prisma.customer.delete({
      where: { customerid },
    });
  } catch (error) {
    throw new Error(`Error deleting customer: ${error.message}`);
  }
};

// Search customers
const searchCustomers = async (searchTerm) => {
  try {
    return await prisma.customer.findMany({
      where: {
        OR: [
          { firstname: { contains: searchTerm, mode: 'insensitive' } },
          { lastname: { contains: searchTerm, mode: 'insensitive' } },
          { emailadd: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
    });
  } catch (error) {
    throw new Error(`Error searching customers: ${error.message}`);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  getCustomerByEmail,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
};