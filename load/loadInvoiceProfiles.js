const { fetchInvoiceProfiles } = require('../extract/fetchInvoiceProfile')
const { salesDwConnection } = require('../extract/dbConnection')

async function loadInvoiceProfiles() {
    const profiles = await fetchInvoiceProfiles()

    await salesDwConnection.getQueryInterface()
        .bulkInsert('DimInvoiceProfile', profiles, { ignoreDuplicates: true })

    console.log("DimInvoiceProfile table loaded successfully! (y)")
}

module.exports = { loadInvoiceProfiles }