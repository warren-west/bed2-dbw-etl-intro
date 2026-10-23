// loadDimDate.js
// DimDate is a calendar, so it is generated rather than extracted from a source table.
// The only thing taken from the operational database is the date range to cover.

const { QueryTypes } = require('sequelize')

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']

const pad = (n, width = 2) => String(n).padStart(width, '0')

// Accepts a Date or 'YYYY-MM-DD' string and returns a UTC-midnight Date
function toUtcDate(value) {
    if (value instanceof Date) {
        return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()))
    }
    const [y, m, d] = String(value).slice(0, 10).split('-').map(Number)
    return new Date(Date.UTC(y, m - 1, d))
}

// ISO 8601 week number (weeks start on Monday; week 1 contains the first Thursday)
function isoWeek(date) {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    const dayNum = d.getUTCDay() || 7               // Mon=1 ... Sun=7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)       // move to the Thursday of this week
    const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1)
    return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}

// One row per day from startDate to endDate (inclusive), matching sales_dw.DimDate
function generateDimDate(startDate, endDate) {
    const rows = []
    const end = toUtcDate(endDate)

    for (let d = toUtcDate(startDate); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
        const year = d.getUTCFullYear()
        const month = d.getUTCMonth() + 1
        const day = d.getUTCDate()
        const dow = d.getUTCDay() || 7                // ISO: 1 = Monday ... 7 = Sunday
        const quarter = Math.ceil(month / 3)

        rows.push({
            DateKey: year * 10000 + month * 100 + day,   // e.g. 20261022
            FullDate: `${year}-${pad(month)}-${pad(day)}`,
            DayOfMonth: day,
            DayOfWeekNum: dow,
            DayName: DAY_NAMES[dow - 1],
            WeekOfYear: isoWeek(d),
            MonthNum: month,
            MonthName: MONTH_NAMES[month - 1],
            YearMonth: `${year}-${pad(month)}`,
            QuarterNum: quarter,
            QuarterName: `Q${quarter}`,
            YearNum: year,
            IsWeekend: dow >= 6 ? 1 : 0,
        })
    }
    return rows
}

// Reads the first and last invoice dates, then pads to whole calendar years
// (Jan 1 of the first year to Dec 31 of the last) so reports never hit a missing date.
async function getDateRange(sequelizeDBConnection) {
    const [range] = await sequelizeDBConnection.query(
        `SELECT DATE(MIN(InvoiceDate)) AS MinDate, DATE(MAX(InvoiceDate)) AS MaxDate FROM Invoice`,
        { type: QueryTypes.SELECT }
    )
    if (!range || !range.MinDate || !range.MaxDate) return null // no invoices yet

    return {
        start: `${toUtcDate(range.MinDate).getUTCFullYear()}-01-01`,
        end: `${toUtcDate(range.MaxDate).getUTCFullYear()}-12-31`,
    }
}

// Generates the calendar and loads it. Existing dates are skipped, so it is safe to re-run.
async function loadDimDate(sequelizeDBConnection, sequelizeDWConnection, { chunkSize = 1000 } = {}) {
    const range = await getDateRange(sequelizeDBConnection)
    if (!range) return { inserted: 0 }

    const rows = generateDimDate(range.start, range.end)
    const qi = sequelizeDWConnection.getQueryInterface()

    await sequelizeDWConnection.transaction(async (transaction) => {
        for (let i = 0; i < rows.length; i += chunkSize) {
            await qi.bulkInsert('DimDate', rows.slice(i, i + chunkSize), {
                transaction,
                ignoreDuplicates: true, // INSERT IGNORE on MySQL
            })
        }
    })

    return { start: range.start, end: range.end, generated: rows.length }
}

module.exports = { loadDimDate }