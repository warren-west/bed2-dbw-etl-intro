const { fetchAllProducts, fetchAllCustomers } = require('../extract/fetchAllData')
const isValidEmail = require('../sidenotes/validateEmail')

async function cleanProducts() {
    // get all the products and their categories from the operational DB
    const products = await fetchAllProducts()

    // Checking for null values in the "ParentCategoryName" field
    // and replacing "null" with "No parent category defined"
    products.map(p => {
        if (!p.ParentCategoryName) {
            p.ParentCategoryName = "No parent category defined"
        }
    })

    // Checking for null values in the "UnitPrice" field
    // reject any products without a UnitPrice
    // finally, return the "cleaned" products
    return products.filter(p => p.UnitPrice !== null)
}

async function cleanCustomers() {
    const customers = await fetchAllCustomers()

    // todo:
    // clean the customer records for the DW
    customers.map(c => {
        // c.Email = isValidEmail(c.Email) ? c.Email : "No email provided"
        if (!isValidEmail(c.Email)) {
            console.log("Invalid email found", c.Email)
            c.Email = "No email provided"
            // console.log(c)
        }
        return c
    })

    return customers
}

module.exports = {
    cleanProducts,
    cleanCustomers,
}