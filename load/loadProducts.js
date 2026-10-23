const { cleanProducts } = require('../transform/transformChain')
const { salesDwConnection } = require('../extract/dbConnection')
const { QueryTypes } = require('sequelize')

const OPEN_END = '9999-12-31 00:00:00'

// Attributes whose changes create a new version, and how to normalise each one so
// '59.00' (string from MySQL) and 59 (number) compare as equal.
const TRACKED = {
    Sku: 'text',
    ProductName: 'text',
    ProductDescription: 'text',
    CategoryId: 'int',
    CategoryName: 'text',
    ParentCategoryName: 'text',
    ListPrice: 'money',
    UnitCost: 'money',
    IsActive: 'bool',
}

function normalise(type, value) {
    if (value === null || value === undefined) return null
    switch (type) {
        case 'text': {
            const s = String(value).trim()
            return s === '' ? null : s
        }
        case 'int': {
            const n = Number.parseInt(value, 10)
            return Number.isNaN(n) ? null : n
        }
        case 'money': {
            if (String(value).trim() === '') return null
            const n = Number(value)
            return Number.isNaN(n) ? null : n.toFixed(2)
        }
        case 'bool':
            return value === true || value === 1 || value === '1' || value === 'true' ? 1 : 0
        default:
            return value
    }
}

// Maps one cleaned source Product onto DimProduct's columns (minus the SCD tracking columns)
function toDimRow(row) {
    return {
        ProductId: Number.parseInt(row.ProductId, 10),
        Sku: normalise('text', row.Sku),
        ProductName: normalise('text', row.Name),
        ProductDescription: normalise('text', row.Description),
        CategoryId: normalise('int', row.CategoryId),
        CategoryName: normalise('text', row.CategoryName),
        ParentCategoryName: normalise('text', row.ParentCategoryName),
        ListPrice: normalise('money', row.UnitPrice),
        UnitCost: normalise('money', row.UnitCost),
        IsActive: normalise('bool', row.IsActive),
        createdOn: row.CreatedAt,   // only used to date the first version; not a DimProduct column
    }
}

// A brand-new product's first version starts on the day it was created (or 1900-01-01
// if unknown), so invoices from before this load still find a matching dimension row.
function firstVersionStart(createdAt) {
    const d = createdAt instanceof Date ? createdAt : new Date(createdAt)
    const day = Number.isNaN(d.getTime()) ? '1900-01-01' : d.toISOString().slice(0, 10)
    return new Date(`${day}T00:00:00Z`)
}

async function loadDimProduct(chunkSize = 1000) {
    const products = await cleanProducts()
    const incoming = products.map(toDimRow)

    // Fail fast, before touching the database, if a row can't be loaded
    const required = ['Sku', 'ProductName', 'CategoryId', 'CategoryName', 'ListPrice']
    const invalid = incoming.filter(
        (p) => !Number.isInteger(p.ProductId) || required.some((col) => p[col] === null)
    )
    if (invalid.length) {
        throw new Error(
            `Cannot load products missing ProductId or required fields (${required.join(', ')}): ` +
            JSON.stringify(invalid.map((p) => p.ProductId))
        )
    }
    const ids = incoming.map((p) => p.ProductId)
    if (new Set(ids).size !== ids.length) throw new Error('Duplicate ProductId values in the incoming data')

    // Current version of every product already in the dimension
    const currentRows = await salesDwConnection.query(
        `SELECT ProductKey, ProductId, ${Object.keys(TRACKED).join(', ')} FROM dimproduct WHERE IsCurrent = 1;`,
        { type: QueryTypes.SELECT }
    )
    const current = new Map(currentRows.map((r) => [r.ProductId, r]))

    const toInsert = []
    const keysToClose = []
    let inserted = 0
    let changed = 0
    let unchanged = 0

    for (const { createdOn, ...p } of incoming) {
        const existing = current.get(p.ProductId)

        if (!existing) {
            toInsert.push({ ...p, EffectiveFrom: firstVersionStart(createdOn), EffectiveTo: OPEN_END, IsCurrent: 1 })
            inserted++
        } else if (Object.entries(TRACKED).some(([col, type]) => normalise(type, existing[col]) !== p[col])) {
            keysToClose.push(existing.ProductKey)
            toInsert.push({ ...p, EffectiveFrom: new Date(), EffectiveTo: OPEN_END, IsCurrent: 1 })
            changed++
        } else {
            unchanged++
        }
    }

    // Only perform the load operation if there are new records to load
    if (toInsert.length >= 1) {
        // One transaction: either every change is applied or none is
        await salesDwConnection.transaction(async (transaction) => {
            if (keysToClose.length) {
                await salesDwConnection.query(
                    `UPDATE DimProduct SET EffectiveTo = NOW(), IsCurrent = 0 WHERE ProductKey IN (:keys)`,
                    { replacements: { keys: keysToClose }, transaction }
                )
            }
            for (let i = 0; i < toInsert.length; i += chunkSize) {
                await salesDwConnection.getQueryInterface()
                    .bulkInsert('DimProduct', toInsert.slice(i, i + chunkSize), { transaction })
            }
        })
    }

    return { inserted, changed, unchanged }
}

module.exports = { loadDimProduct }