const db = require('./extract/dbConnection')
const { loadDimCustomers } = require('./load/loadCustomers')
const { loadDimProduct } = require('./load/loadProducts')
const { loadInvoiceProfiles } = require('./load/loadInvoiceProfiles')
const { loadDimDate } = require('./extract/fetchDateData')

// attempt to connect to the DB and DW
db.connectToDb()
    .then(() => {
        console.log('Connected to sales DB :)')
        db.connectToDw()
            .then(() => {
                console.log('Connected to sales DW :)')
            })
            .catch((err) => {
                console.log('Could not connect to sales DW x')
            })
    })
    .catch((err) => {
        console.log('Could not connect to sales DB x')
    })


// load data into the DB
async function loadDwDimensionTables() {
    try {
        const loadCustomersResults = await loadDimCustomers() // return objects
        console.log(`Completed loading the 'dimcustomer' table.`)
        
        const loadProductsResults = await loadDimProduct() // return objects
        console.log(`Completed loading the 'dimproduct' table.`)
        
        const loadInvoiceResults = await loadInvoiceProfiles() // returns string
        console.log(`Completed loading the 'diminvoiceprofile' table.`)
        
        const loadDateResults = await loadDimDate() // returns an object
        console.log(`Completed loading the 'dimdate' table.`)

    } catch (err) {
        console.log(err)
        console.log(`Something went wrong loading the DW...`)
    }

    console.log(results)
}

loadDwDimensionTables()
    .then(() => {
        console.log('Completed all of the loading...')
    })
    .catch((err) => {
        console.log('Something went wrong while trying to load the DW')
        console.error(err)
    })