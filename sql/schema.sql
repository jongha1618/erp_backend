-- MySQL dump 10.13  Distrib 9.5.0, for Win64 (x86_64)
--
-- Host: localhost    Database: test_db
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'aab2a991-c1b7-11f0-8c04-00155d433890:1-105';

--
-- Table structure for table `ep_customers`
--

DROP TABLE IF EXISTS `ep_customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_customers` (
  `customer_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(100) NOT NULL,
  `contact_name` varchar(100) NOT NULL,
  `contact_email` varchar(100) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `billing_contact_name` varchar(100) DEFAULT NULL,
  `billing_phone` varchar(50) DEFAULT NULL,
  `billing_address` text,
  `billing_address_city` varchar(20) DEFAULT NULL,
  `billing_address_state` varchar(20) DEFAULT NULL,
  `billing_address_zip` varchar(20) DEFAULT NULL,
  `shipping_contact_name` varchar(100) DEFAULT NULL,
  `shipping_phone` varchar(50) DEFAULT NULL,
  `shipping_address` text,
  `shipping_address_city` varchar(20) DEFAULT NULL,
  `shipping_address_state` varchar(20) DEFAULT NULL,
  `shipping_address_zip` varchar(20) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `modified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` int DEFAULT NULL,
  `active` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`customer_id`),
  UNIQUE KEY `contact_email` (`contact_email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_inventories`
--

DROP TABLE IF EXISTS `ep_inventories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_inventories` (
  `inventory_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `location` varchar(100) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `assigned_to` int DEFAULT NULL,
  `pod_id` int DEFAULT NULL,
  `reservation_qty` int DEFAULT '0',
  PRIMARY KEY (`inventory_id`),
  KEY `item_id` (`item_id`),
  KEY `fk_inv_received_by` (`received_by`),
  KEY `fk_inventory_pod` (`pod_id`),
  CONSTRAINT `fk_inv_received_by` FOREIGN KEY (`received_by`) REFERENCES `ep_users` (`user_id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inventory_pod` FOREIGN KEY (`pod_id`) REFERENCES `ep_purchase_order_details` (`pod_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_inventory_transaction_details`
--

DROP TABLE IF EXISTS `ep_inventory_transaction_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_inventory_transaction_details` (
  `inventory_transaction_detail_id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  PRIMARY KEY (`inventory_transaction_detail_id`),
  KEY `transaction_id` (`transaction_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `ep_inventory_transaction_details_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `ep_inventory_transactions` (`inventory_transaction_id`) ON DELETE CASCADE,
  CONSTRAINT `ep_inventory_transaction_details_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `ep_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_inventory_transactions`
--

DROP TABLE IF EXISTS `ep_inventory_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_inventory_transactions` (
  `inventory_transaction_id` int NOT NULL AUTO_INCREMENT,
  `transaction_type` enum('purchase','sale','adjustment') NOT NULL,
  `transaction_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `reference_number` varchar(50) DEFAULT NULL,
  `supplier_or_customer_id` int DEFAULT NULL,
  `purchase_order_id` int DEFAULT NULL,
  `supplier_id` int DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `inventory_id` int DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `quantity` decimal(10,2) DEFAULT NULL,
  `pod_id` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`inventory_transaction_id`),
  UNIQUE KEY `reference_number` (`reference_number`),
  KEY `fk_invtrans_inventory` (`inventory_id`),
  KEY `fk_invtrans_item` (`item_id`),
  KEY `fk_invtrans_pod` (`pod_id`),
  CONSTRAINT `fk_invtrans_inventory` FOREIGN KEY (`inventory_id`) REFERENCES `ep_inventories` (`inventory_id`),
  CONSTRAINT `fk_invtrans_item` FOREIGN KEY (`item_id`) REFERENCES `ep_items` (`item_id`),
  CONSTRAINT `fk_invtrans_pod` FOREIGN KEY (`pod_id`) REFERENCES `ep_purchase_order_details` (`pod_id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_item_details`
--

DROP TABLE IF EXISTS `ep_item_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_item_details` (
  `item_detail_id` int NOT NULL AUTO_INCREMENT,
  `item_id` int DEFAULT NULL,
  `batch_number` varchar(50) DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `location` varchar(100) DEFAULT NULL,
  `transaction_type` varchar(50) DEFAULT NULL,
  `updated_date` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`item_detail_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `ep_item_details_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `ep_items` (`item_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_items`
--

DROP TABLE IF EXISTS `ep_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_items` (
  `item_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `part_number` varchar(100) DEFAULT NULL,
  `item_code` varchar(100) DEFAULT NULL,
  `description` text,
  `serial_number` varchar(100) DEFAULT NULL,
  `unit_price` decimal(10,2) DEFAULT '0.00',
  `instock_quantity` int DEFAULT '0',
  `document_link` varchar(250) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `instock_by` int DEFAULT NULL,
  `in_stock_date` datetime DEFAULT CURRENT_TIMESTAMP,
  `active` int DEFAULT '1',
  PRIMARY KEY (`item_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_purchase_order_details`
--

DROP TABLE IF EXISTS `ep_purchase_order_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_purchase_order_details` (
  `pod_id` int NOT NULL AUTO_INCREMENT,
  `purchaseorder_id` int NOT NULL,
  `item_id` int NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `total_price` decimal(10,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  `received_quantity` int DEFAULT '0',
  `received_date` date DEFAULT NULL,
  `received_by` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`pod_id`),
  KEY `purchaseorder_id` (`purchaseorder_id`),
  KEY `item_id` (`item_id`),
  KEY `fk_pod_received_by` (`received_by`),
  CONSTRAINT `ep_purchase_order_details_ibfk_1` FOREIGN KEY (`purchaseorder_id`) REFERENCES `ep_purchase_orders` (`purchaseorder_id`) ON DELETE CASCADE,
  CONSTRAINT `ep_purchase_order_details_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `ep_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pod_received_by` FOREIGN KEY (`received_by`) REFERENCES `ep_users` (`user_id`),
  CONSTRAINT `ep_purchase_order_details_chk_1` CHECK ((`quantity` > 0)),
  CONSTRAINT `ep_purchase_order_details_chk_2` CHECK ((`unit_price` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_purchase_orders`
--

DROP TABLE IF EXISTS `ep_purchase_orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_purchase_orders` (
  `purchaseorder_id` int NOT NULL AUTO_INCREMENT,
  `supplier_id` int NOT NULL,
  `order_date` date NOT NULL,
  `expected_delivery` date DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `status` enum('Pending','Approved','Shipped','Received','Cancelled') DEFAULT 'Pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `po_number` varchar(50) DEFAULT NULL,
  `notes` text,
  `received_date` date DEFAULT NULL,
  `document_link` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`purchaseorder_id`),
  UNIQUE KEY `po_number` (`po_number`),
  KEY `supplier_id` (`supplier_id`),
  CONSTRAINT `ep_purchase_orders_ibfk_1` FOREIGN KEY (`supplier_id`) REFERENCES `ep_suppliers` (`supplier_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_sale_details`
--

DROP TABLE IF EXISTS `ep_sale_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_sale_details` (
  `detail_id` int NOT NULL AUTO_INCREMENT,
  `sale_id` int DEFAULT NULL,
  `item_id` int DEFAULT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) DEFAULT NULL,
  `subtotal` decimal(10,2) DEFAULT NULL,
  `shipped_quantity` int DEFAULT '0',
  `shipped_date` date DEFAULT NULL,
  `shipped_by` int DEFAULT NULL,
  `notes` text,
  PRIMARY KEY (`detail_id`),
  KEY `item_id` (`item_id`),
  KEY `fk_sale_details_sale` (`sale_id`),
  KEY `fk_sale_details_shipped_by` (`shipped_by`),
  CONSTRAINT `ep_sale_details_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `ep_items` (`item_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sale_details_sale` FOREIGN KEY (`sale_id`) REFERENCES `ep_sales` (`sale_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sale_details_shipped_by` FOREIGN KEY (`shipped_by`) REFERENCES `ep_users` (`user_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_sales`
--

DROP TABLE IF EXISTS `ep_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_sales` (
  `sale_id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int DEFAULT NULL,
  `sales_number` varchar(50) DEFAULT NULL,
  `order_date` date DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `status` varchar(20) DEFAULT 'draft',
  `notes` text,
  `shipping_address` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`sale_id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `ep_sales_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `ep_customers` (`customer_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_suppliers`
--

DROP TABLE IF EXISTS `ep_suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_suppliers` (
  `supplier_id` int NOT NULL AUTO_INCREMENT,
  `company_name` varchar(255) NOT NULL,
  `contact_name` varchar(255) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `contact_email` varchar(255) DEFAULT NULL,
  `billing_contact_name` varchar(255) DEFAULT NULL,
  `billing_contact_phone` varchar(20) DEFAULT NULL,
  `billing_contact_email` varchar(255) DEFAULT NULL,
  `billing_address` text,
  `billing_address_city` varchar(100) DEFAULT NULL,
  `billing_address_state` varchar(100) DEFAULT NULL,
  `billing_address_country` varchar(100) DEFAULT NULL,
  `billing_address_zip` varchar(20) DEFAULT NULL,
  `shipping_contact_name` varchar(255) DEFAULT NULL,
  `shipping_contact_phone` varchar(20) DEFAULT NULL,
  `shipping_contact_email` varchar(255) DEFAULT NULL,
  `shipping_address` text,
  `shipping_address_city` varchar(100) DEFAULT NULL,
  `shipping_address_state` varchar(100) DEFAULT NULL,
  `shipping_address_country` varchar(100) DEFAULT NULL,
  `shipping_address_zip` varchar(20) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `tax_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `modified_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `modified_by` int DEFAULT NULL,
  `active` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `contact_email` (`contact_email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ep_users`
--

DROP TABLE IF EXISTS `ep_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ep_users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `active` int DEFAULT '1',
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-05 14:04:08
