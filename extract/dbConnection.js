require('dotenv').config()
const { Sequelize } = require('sequelize')


// Connection to OLTP Database
const sequelizeSales = new Sequelize({
    database: process.env.DB_NAME, // <-- Operational Database Name
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false,
})



// Connection to OLAP Data Warehouse
const sequelizeSalesDW = new Sequelize({
    database: process.env.DW_NAME, // <-- Analytical Data Warehouse Name
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST,
    dialect: process.env.DB_DIALECT,
    logging: false,
})