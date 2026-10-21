const db = require('./extract/dbConnection')

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

// pulling data from the DB

const { cleanProducts, cleanCustomers } = require('./transform/transformChain')
cleanProducts() // log out products
cleanCustomers()