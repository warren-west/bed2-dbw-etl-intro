const { salesDbConnection } = require('./dbConnection')

async function fetchInvoiceProfiles() {
    // We are extracting and transforming at the same time using SQL
    // Getting all of the InvoiceStatus and PaymentMethod instances,
    // and replacing any "null" values with "Unknown"
    const profiles = await salesDbConnection.query(
        `SELECT DISTINCT TRIM(Status) AS InvoiceStatus,
            COALESCE(NULLIF(TRIM(PaymentMethod), ''), 'Unknown') AS PaymentMethod
            FROM Invoice`,
        { type: QueryTypes.SELECT }
    )

    // return the extracted and cleaned profiles
    return profiles
}

module.exports = { fetchInvoiceProfiles }