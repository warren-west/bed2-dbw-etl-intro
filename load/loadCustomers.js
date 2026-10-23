const { cleanCustomers } = require('../transform/transformChain')
const { salesDwConnection } = require('../extract/dbConnection')
const { QueryTypes } = require('sequelize')

const OPEN_END = '9999-12-31 00:00:00'

// Attributes whose changes create a new version. CustomerSince never changes, so it is not tracked.
const TRACKED = ['FirstName', 'LastName', 'FullName', 'Email', 'City', 'PostalCode', 'Country']

const text = (v) => {
    if (v === null || v === undefined) return null
    const s = String(v).trim()
    return s === '' ? null : s
}

// A brand-new customer's first version starts on the day they joined (or 1900-01-01 if unknown),
// so invoices from before this load still find a matching dimension row.
function firstVersionStart(customerSince) {
    return new Date(`${customerSince ?? '1900-01-01'}T00:00:00Z`)
}

async function loadDimCustomers(chunkSize = 1000) {
    const incoming = await cleanCustomers()

    // Type 2: Slowly changing dimension
    // How we deal with new versions of customers:
    const ids = incoming.map((c) => c.CustomerId)
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate CustomerId values in the incoming data')

    // Current version of every customer already in the dimension
    const currentRows = await salesDwConnection.query(
        `SELECT CustomerKey, CustomerId, ${TRACKED.join(', ')} FROM dimcustomer WHERE IsCurrent = 1;`,
        { type: QueryTypes.SELECT }
    )
    const current = new Map(currentRows.map((r) => [r.CustomerId, r]))

    const toInsert = []
    const keysToClose = []
    let inserted = 0
    let changed = 0
    let unchanged = 0

    for (const c of incoming) {
        const existing = current.get(c.CustomerId)

        if (!existing) {
            toInsert.push({ ...c, EffectiveFrom: firstVersionStart(c.CustomerSince), EffectiveTo: OPEN_END, IsCurrent: 1 })
            inserted++
        } else if (TRACKED.some((col) => (text(existing[col]) ?? null) !== (c[col] ?? null))) {
            keysToClose.push(existing.CustomerKey)
            toInsert.push({ ...c, EffectiveFrom: new Date(), EffectiveTo: OPEN_END, IsCurrent: 1 })
            changed++
        } else {
            unchanged++
        }
    }

    // Only perform insertion operation on the DB if there are records to insert.
    if (toInsert.length >= 1) {
        // One transaction: either every change is applied or none is
        await salesDwConnection.transaction(async (transaction) => {
            if (keysToClose.length) {
                await salesDwConnection.query(
                    `UPDATE DimCustomer SET EffectiveTo = NOW(), IsCurrent = 0 WHERE CustomerKey IN (:keys)`,
                    { replacements: { keys: keysToClose }, transaction }
                )
            }
            for (let i = 0; i < toInsert.length; i += chunkSize) {
                await salesDwConnection.getQueryInterface()
                    .bulkInsert('DimCustomer', toInsert.slice(i, i + chunkSize), { transaction })
            }
        })
    }

    return { inserted, changed, unchanged }
}

module.exports = { loadDimCustomers }