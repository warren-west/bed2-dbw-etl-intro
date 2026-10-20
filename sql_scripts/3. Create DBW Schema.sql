-- Sales data warehouse: star schema (MySQL 8.0.16+)
--
-- Fact table : FactSales        (grain = one row per invoice line)
-- Dimensions : DimDate, DimCustomer, DimProduct, DimInvoiceProfile
-- Source     : the transactional `sales` database
--              (Category, Product, Customer, Invoice, InvoiceLine)

CREATE DATABASE IF NOT EXISTS sales_dw
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE sales_dw;

-- Drop in reverse dependency order so the script can be re-run
DROP TABLE IF EXISTS FactSales;
DROP TABLE IF EXISTS DimInvoiceProfile;
DROP TABLE IF EXISTS DimProduct;
DROP TABLE IF EXISTS DimCustomer;
DROP TABLE IF EXISTS DimDate;

-- ---------------------------------------------------------------------------
-- DimDate: one row per calendar day. DateKey is a smart key in YYYYMMDD form.
-- ---------------------------------------------------------------------------
CREATE TABLE DimDate (
    DateKey        INT          NOT NULL,           -- e.g. 20261019
    FullDate       DATE         NOT NULL,
    DayOfMonth     TINYINT      NOT NULL,
    DayOfWeekNum   TINYINT      NOT NULL,           -- 1 = Monday ... 7 = Sunday (ISO)
    DayName        VARCHAR(10)  NOT NULL,
    WeekOfYear     TINYINT      NOT NULL,           -- ISO week number
    MonthNum       TINYINT      NOT NULL,
    MonthName      VARCHAR(10)  NOT NULL,
    YearMonth      CHAR(7)      NOT NULL,           -- e.g. '2026-10'
    QuarterNum     TINYINT      NOT NULL,
    QuarterName    CHAR(2)      NOT NULL,           -- 'Q1' ... 'Q4'
    YearNum        SMALLINT     NOT NULL,
    IsWeekend      TINYINT(1)   NOT NULL,
    PRIMARY KEY (DateKey),
    CONSTRAINT UQ_DimDate_FullDate UNIQUE (FullDate)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- DimCustomer: Type 2 slowly changing dimension (tracks address changes).
-- CustomerKey is the warehouse surrogate key; CustomerId is the source key.
-- ---------------------------------------------------------------------------
CREATE TABLE DimCustomer (
    CustomerKey     INT           NOT NULL AUTO_INCREMENT,
    CustomerId      INT           NOT NULL,                 -- natural key from source Customer
    FirstName       VARCHAR(100)  NOT NULL,
    LastName        VARCHAR(100)  NOT NULL,
    FullName        VARCHAR(201)  NOT NULL,
    Email           VARCHAR(255)  NOT NULL,
    City            VARCHAR(100)  NULL,
    PostalCode      VARCHAR(20)   NULL,
    Country         VARCHAR(100)  NULL,
    CustomerSince   DATE          NULL,                     -- source Customer.CreatedAt (date part)
    -- SCD Type 2 tracking columns
    EffectiveFrom   DATETIME      NOT NULL,
    EffectiveTo     DATETIME      NOT NULL DEFAULT '9999-12-31 00:00:00',
    IsCurrent       TINYINT(1)    NOT NULL DEFAULT 1,
    PRIMARY KEY (CustomerKey),
    CONSTRAINT UQ_DimCustomer_Id_From UNIQUE (CustomerId, EffectiveFrom),
    INDEX IX_DimCustomer_Country (Country)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- DimProduct: Type 2 SCD. Category is flattened into the product row
-- (denormalised) so queries need no extra join. ParentCategoryName holds the
-- top-level category when the source category has a parent.
-- ---------------------------------------------------------------------------
CREATE TABLE DimProduct (
    ProductKey          INT            NOT NULL AUTO_INCREMENT,
    ProductId           INT            NOT NULL,            -- natural key from source Product
    Sku                 VARCHAR(50)    NOT NULL,
    ProductName         VARCHAR(200)   NOT NULL,
    ProductDescription  VARCHAR(1000)  NULL,
    CategoryId          INT            NOT NULL,            -- source Category.CategoryId
    CategoryName        VARCHAR(100)   NOT NULL,
    ParentCategoryName  VARCHAR(100)   NULL,
    ListPrice           DECIMAL(10,2)  NOT NULL,            -- list price while this version was current
    UnitCost            DECIMAL(10,2)  NULL,
    IsActive            TINYINT(1)     NOT NULL,
    -- SCD Type 2 tracking columns
    EffectiveFrom       DATETIME       NOT NULL,
    EffectiveTo         DATETIME       NOT NULL DEFAULT '9999-12-31 00:00:00',
    IsCurrent           TINYINT(1)     NOT NULL DEFAULT 1,
    PRIMARY KEY (ProductKey),
    CONSTRAINT UQ_DimProduct_Id_From UNIQUE (ProductId, EffectiveFrom),
    INDEX IX_DimProduct_Category (CategoryName),
    INDEX IX_DimProduct_Sku (Sku)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- DimInvoiceProfile: small "junk" dimension combining low-cardinality invoice
-- attributes (status and payment method) so they don't bloat the fact table.
-- ---------------------------------------------------------------------------
CREATE TABLE DimInvoiceProfile (
    InvoiceProfileKey  INT          NOT NULL AUTO_INCREMENT,
    InvoiceStatus      VARCHAR(20)  NOT NULL,     -- Pending, Paid, Shipped, Cancelled, Refunded
    PaymentMethod      VARCHAR(30)  NOT NULL DEFAULT 'Unknown',
    PRIMARY KEY (InvoiceProfileKey),
    CONSTRAINT UQ_DimInvoiceProfile UNIQUE (InvoiceStatus, PaymentMethod)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- FactSales: grain = one row per invoice line.
-- Measures are calculated during ETL from the source InvoiceLine and Product:
--   GrossAmount    = Quantity * UnitPrice
--   DiscountAmount = GrossAmount * DiscountPct / 100
--   NetAmount      = GrossAmount - DiscountAmount
--   TaxAmount      = NetAmount * TaxRatePct / 100
--   TotalAmount    = NetAmount + TaxAmount
--   CostAmount     = Quantity * product UnitCost
--   GrossProfit    = NetAmount - CostAmount
-- ---------------------------------------------------------------------------
CREATE TABLE FactSales (
    SalesKey           BIGINT         NOT NULL AUTO_INCREMENT,
    -- Dimension keys
    DateKey            INT            NOT NULL,
    CustomerKey        INT            NOT NULL,
    ProductKey         INT            NOT NULL,
    InvoiceProfileKey  INT            NOT NULL,
    -- Degenerate dimensions (identifiers that live in the fact table)
    InvoiceId          INT            NOT NULL,       -- source Invoice.InvoiceId
    InvoiceNumber      VARCHAR(30)    NOT NULL,
    InvoiceLineId      INT            NOT NULL,       -- source InvoiceLine.InvoiceLineId (ETL idempotency)
    InvoiceLineNumber  INT            NOT NULL,
    InvoiceDateTime    DATETIME       NOT NULL,
    -- Measures
    Quantity           INT            NOT NULL,
    UnitPrice          DECIMAL(10,2)  NOT NULL,
    DiscountPct        DECIMAL(5,2)   NOT NULL,
    TaxRatePct         DECIMAL(5,2)   NOT NULL,
    GrossAmount        DECIMAL(12,2)  NOT NULL,
    DiscountAmount     DECIMAL(12,2)  NOT NULL,
    NetAmount          DECIMAL(12,2)  NOT NULL,
    TaxAmount          DECIMAL(12,2)  NOT NULL,
    TotalAmount        DECIMAL(12,2)  NOT NULL,
    CostAmount         DECIMAL(12,2)  NULL,
    GrossProfit        DECIMAL(12,2)  NULL,
    -- ETL audit
    LoadedAt           DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (SalesKey),
    CONSTRAINT UQ_FactSales_SourceLine UNIQUE (InvoiceLineId),
    CONSTRAINT FK_FactSales_Date    FOREIGN KEY (DateKey)           REFERENCES DimDate (DateKey),
    CONSTRAINT FK_FactSales_Cust    FOREIGN KEY (CustomerKey)       REFERENCES DimCustomer (CustomerKey),
    CONSTRAINT FK_FactSales_Prod    FOREIGN KEY (ProductKey)        REFERENCES DimProduct (ProductKey),
    CONSTRAINT FK_FactSales_Profile FOREIGN KEY (InvoiceProfileKey) REFERENCES DimInvoiceProfile (InvoiceProfileKey),
    INDEX IX_FactSales_InvoiceNumber (InvoiceNumber),
    INDEX IX_FactSales_Date_Product (DateKey, ProductKey)
) ENGINE=InnoDB;