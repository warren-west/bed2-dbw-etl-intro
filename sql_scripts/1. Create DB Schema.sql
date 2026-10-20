-- Sales transactions database schema (MySQL 8.0.16+)
-- Tables: Category, Product, Customer, Invoice, InvoiceLine
-- CHECK constraints are only enforced from MySQL 8.0.16 onwards.

CREATE DATABASE IF NOT EXISTS sales
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;
USE sales;

-- Drop in reverse dependency order so the script can be re-run
DROP VIEW  IF EXISTS vw_InvoiceTotals;
DROP TABLE IF EXISTS InvoiceLine;
DROP TABLE IF EXISTS Invoice;
DROP TABLE IF EXISTS Product;
DROP TABLE IF EXISTS Category;
DROP TABLE IF EXISTS Customer;

CREATE TABLE Category (
    CategoryId        INT           NOT NULL AUTO_INCREMENT,
    Name              VARCHAR(100)  NOT NULL,
    Description       VARCHAR(500)  NULL,
    ParentCategoryId  INT           NULL,  -- optional hierarchy (e.g. Electronics > Phones)
    PRIMARY KEY (CategoryId),
    CONSTRAINT UQ_Category_Name UNIQUE (Name),
    CONSTRAINT FK_Category_Parent FOREIGN KEY (ParentCategoryId)
        REFERENCES Category (CategoryId)
) ENGINE=InnoDB;

CREATE TABLE Product (
    ProductId    INT            NOT NULL AUTO_INCREMENT,
    Sku          VARCHAR(50)    NOT NULL,
    Name         VARCHAR(200)   NOT NULL,
    Description  VARCHAR(1000)  NULL,
    CategoryId   INT            NOT NULL,
    UnitPrice    DECIMAL(10,2)  NOT NULL,   -- current list price
    UnitCost     DECIMAL(10,2)  NULL,       -- for margin reporting
    IsActive     TINYINT(1)     NOT NULL DEFAULT 1,
    CreatedAt    DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ProductId),
    CONSTRAINT UQ_Product_Sku UNIQUE (Sku),
    CONSTRAINT FK_Product_Category FOREIGN KEY (CategoryId)
        REFERENCES Category (CategoryId),
    CONSTRAINT CK_Product_UnitPrice CHECK (UnitPrice >= 0),
    CONSTRAINT CK_Product_UnitCost  CHECK (UnitCost IS NULL OR UnitCost >= 0)
) ENGINE=InnoDB;

CREATE TABLE Customer (
    CustomerId    INT            NOT NULL AUTO_INCREMENT,
    FirstName     VARCHAR(100)   NOT NULL,
    LastName      VARCHAR(100)   NOT NULL,
    Email         VARCHAR(255)   NOT NULL,
    Phone         VARCHAR(30)    NULL,
    AddressLine1  VARCHAR(200)   NULL,
    AddressLine2  VARCHAR(200)   NULL,
    City          VARCHAR(100)   NULL,
    PostalCode    VARCHAR(20)    NULL,
    Country       VARCHAR(100)   NULL,
    CreatedAt     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (CustomerId),
    CONSTRAINT UQ_Customer_Email UNIQUE (Email)
) ENGINE=InnoDB;

CREATE TABLE Invoice (
    InvoiceId      INT           NOT NULL AUTO_INCREMENT,
    InvoiceNumber  VARCHAR(30)   NOT NULL,   -- human-friendly, e.g. INV-2026-000123
    CustomerId     INT           NOT NULL,
    InvoiceDate    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status         VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    PaymentMethod  VARCHAR(30)   NULL,
    PRIMARY KEY (InvoiceId),
    CONSTRAINT UQ_Invoice_InvoiceNumber UNIQUE (InvoiceNumber),
    CONSTRAINT FK_Invoice_Customer FOREIGN KEY (CustomerId)
        REFERENCES Customer (CustomerId),
    CONSTRAINT CK_Invoice_Status CHECK (Status IN ('Pending', 'Paid', 'Shipped', 'Cancelled', 'Refunded'))
) ENGINE=InnoDB;

CREATE TABLE InvoiceLine (
    InvoiceLineId  INT            NOT NULL AUTO_INCREMENT,
    InvoiceId      INT            NOT NULL,
    LineNumber     INT            NOT NULL,   -- 1, 2, 3 ... within an invoice
    ProductId      INT            NOT NULL,
    Quantity       INT            NOT NULL,
    UnitPrice      DECIMAL(10,2)  NOT NULL,   -- price snapshot at time of sale
    DiscountPct    DECIMAL(5,2)   NOT NULL DEFAULT 0,
    TaxRatePct     DECIMAL(5,2)   NOT NULL DEFAULT 0,
    PRIMARY KEY (InvoiceLineId),
    CONSTRAINT UQ_InvoiceLine_Invoice_Line UNIQUE (InvoiceId, LineNumber),
    CONSTRAINT FK_InvoiceLine_Invoice FOREIGN KEY (InvoiceId)
        REFERENCES Invoice (InvoiceId) ON DELETE CASCADE,
    CONSTRAINT FK_InvoiceLine_Product FOREIGN KEY (ProductId)
        REFERENCES Product (ProductId),
    CONSTRAINT CK_InvoiceLine_Quantity  CHECK (Quantity > 0),
    CONSTRAINT CK_InvoiceLine_UnitPrice CHECK (UnitPrice >= 0),
    CONSTRAINT CK_InvoiceLine_Discount  CHECK (DiscountPct BETWEEN 0 AND 100),
    CONSTRAINT CK_InvoiceLine_Tax       CHECK (TaxRatePct BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- InnoDB automatically indexes foreign key columns, so only extra lookups need an index here
CREATE INDEX IX_Invoice_InvoiceDate ON Invoice (InvoiceDate);

-- Invoice totals are derived from lines rather than stored, so they can't drift out of sync
CREATE VIEW vw_InvoiceTotals AS
SELECT
    i.InvoiceId,
    i.InvoiceNumber,
    i.CustomerId,
    i.InvoiceDate,
    i.Status,
    COALESCE(SUM(ROUND(l.Quantity * l.UnitPrice * (1 - l.DiscountPct / 100), 2)), 0) AS Subtotal,
    COALESCE(SUM(ROUND(l.Quantity * l.UnitPrice * (1 - l.DiscountPct / 100) * (l.TaxRatePct / 100), 2)), 0) AS TaxTotal,
    COALESCE(SUM(ROUND(l.Quantity * l.UnitPrice * (1 - l.DiscountPct / 100) * (1 + l.TaxRatePct / 100), 2)), 0) AS Total
FROM Invoice i
LEFT JOIN InvoiceLine l ON l.InvoiceId = i.InvoiceId
GROUP BY i.InvoiceId, i.InvoiceNumber, i.CustomerId, i.InvoiceDate, i.Status;