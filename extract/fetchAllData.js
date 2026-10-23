const { QueryTypes } = require('sequelize')
const db = require('./dbConnection')

async function fetchAllProducts() {
    return await db.salesDb.query(
        `SELECT p.*, c.Name AS CategoryName, pc.Name AS ParentCategoryName
            FROM Product p
            JOIN Category c ON c.CategoryId = p.CategoryId
            LEFT JOIN Category pc ON pc.CategoryId = c.ParentCategoryId;`,
        { type: QueryTypes.SELECT }
    )
}

async function fetchAllCustomers() {
    return await db.salesDb.query(`SELECT CustomerId, FirstName, LastName, Email, City, PostalCode, Country, CreatedAt AS CustomerSince FROM customer;`,
        {
            type: QueryTypes.SELECT
        }
    )
}

async function fetchAllInvoices() {
    return await db.salesDb.query('...', { type: QueryTypes.SELECT })
}

module.exports = {
    fetchAllProducts,
    fetchAllCustomers,
}