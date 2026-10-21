const { fetchAllProducts, fetchAllCustomers } = require('../extract/fetchAllData')
const isValidEmail = require('../sidenotes/validateEmail')


async function cleanProducts() {
    const products = await fetchAllProducts()

    // console.log(products)

    products.map(p => {
        if (!p.ParentCategoryName) {
            p.ParentCategoryName = "No parent category defined"
        }
    })

    console.log(products) // log cleaned rows


    products.filter(p => p.UnitPrice !== null)
}

async function cleanCustomers() {
    const customers = await fetchAllCustomers()

    console.log(customers)

    // todo:
    // clean the customer records for the DW

}

module.exports = {
    cleanProducts,
    cleanCustomers,
}