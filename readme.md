# Intro to ETL
Extract: Fetch data from sources.
Transform: Process the data to be cleaned, correct, and conformed to the warehouse schema.
Load: Move the data into the warehouse database.

## Usage:

### Dependencies
Start by installing the project dependencies, run:
```bash
npm install
```

### Environment Variables
Create a `.env` file and copy in the contents of the `.env.example` file, and fill in the missing values.

### Database
1. Create the transactional / operational database schema by running the SQL script in `./sql_scripts/1. Create DB Schema.sql`.
2. Next, populate the database with data by running the SQL script in `./sql_scripts/2. Seed Database.sql`
3. Create the data warehouse schema by running the SQL script in `./sql_scripts/3. Create DBW Schema.sql`.

> *You can run these scripts in MySql Workbench.*

## In the Code
So far I have:
- Created the `extract` folder to hold source code to do with extracting data from at least one source (for now, the *sales* DB).
- Created a `dbCOnnection.js` file to connect to the *sales* DB we are extracting data from, and to the *sales_dw* DB we are loading into.

## Todo:
- Extract data from *sales* DB.
- Decide on transformation rules.
- Write functions to apply transformation logic.