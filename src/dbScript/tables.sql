-- client_profile
CREATE TABLE `uni_solution`.`client_files` (
  `client_file_id` INT NOT NULL AUTO_INCREMENT,
  `organization_id` INT(11) NOT NULL,
  `original_file_name` VARCHAR(200) NOT NULL,
  `output_file_name` VARCHAR(200) NULL,
  `status` TINYINT(1) NULL DEFAULT 1,
  `created_by` INT(11) NULL DEFAULT 0,
  `updated_by` INT(11) NULL DEFAULT 0,
  `created_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_file_id`));

CREATE TABLE `client_profile` (
    `client_profile_id` INT NOT NULL AUTO_INCREMENT,
    `client_id` INT(11) NOT NULL,
    `organization_id` INT(11) NOT NULL,
    `pan_number` VARCHAR(45) NULL,
    `bank_name` VARCHAR(200) NULL,
    `bank_account_number` VARCHAR(100) NULL,
    `bank_ifsc_code` VARCHAR(100) NULL,
    `date_of_birth` DATETIME NULL,
    `default_dp` VARCHAR(45) NULL,
    `status` TINYINT(1) NULL DEFAULT '1',
    `created_by` INT(11) NULL DEFAULT 0,
    `updated_by` INT(11) NULL DEFAULT 0,
    `created_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`client_profile_id`));


CREATE TABLE `clients` (
  `client_id` INT NOT NULL AUTO_INCREMENT,
  `organization_id` INT(11) NOT NULL,
  `client_code` VARCHAR(50) NOT NULL,
  `client_name` VARCHAR(150) NOT NULL,
  `mobile` VARCHAR(15) NOT NULL,
  `email` VARCHAR(50) NOT NULL,
  `branch_code` VARCHAR(45) NULL DEFAULT NULL,
  `sub_broker_code` VARCHAR(45) NULL DEFAULT NULL,
  `dealer_code` VARCHAR(45) NULL DEFAULT '',
  `status` TINYINT(1) NULL DEFAULT 1,
  `created_by` INT(11) NULL DEFAULT 0,
  `updated_by` INT(11) NULL DEFAULT 0,
  `created_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_id`));


CREATE TABLE `client_address` (
  `client_address_id` INT NOT NULL AUTO_INCREMENT,
  `client_id` VARCHAR(45) NOT NULL,
  `organization_id` VARCHAR(45) NOT NULL,
  `city_id` INT(11) NULL DEFAULT 0,
  `city` VARCHAR(45) NULL DEFAULT NULL,
  `pin_code` VARCHAR(45) NULL DEFAULT NULL,
  `address_1` VARCHAR(255) NULL DEFAULT NULL,
  `address_2` VARCHAR(200) NULL DEFAULT NULL,
  `status` TINYINT(1) NULL DEFAULT 1,
  `created_by` INT(11) NULL DEFAULT 0,
  `updated_by` INT(11) NULL DEFAULT 0,
  `created_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_address_id`));

CREATE TABLE `pre_tades_files` (
  `pre_tades_file_id` int NOT NULL AUTO_INCREMENT,
  `organization_id` int DEFAULT NULL,
  `original_file_name` varchar(255) DEFAULT NULL,
  `output_file_name` varchar(255) DEFAULT NULL,
  `status` tinyint(1) DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `created_date` datetime DEFAULT NULL,
  `updated_date` datetime DEFAULT NULL,
  PRIMARY KEY (`pre_tades_file_id`)
);

CREATE TABLE `client_pre_trade_info` (
  `client_pre_trade_info_id` INT(11) NOT NULL AUTO_INCREMENT,
  `pre_tades_file_id` INT(11) NOT NULL,
  `organization_id` INT(11) NOT NULL,
  `client_id` INT(11) NOT NULL,
  `client_code` VARCHAR(100) NOT NULL,
  `exchange_code` VARCHAR(45) NOT NULL,
  `buy_or_sell` VARCHAR(100) NOT NULL,
  `product` VARCHAR(100) NOT NULL,
  `script_name` VARCHAR(45) NOT NULL,
  `quantity` DOUBLE NOT NULL,
  `lots` VARCHAR(45) NOT NULL,
  `order_type` VARCHAR(45) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  `discounted_quantity` DOUBLE NULL,
  `trigger_price` DECIMAL(10,2) NULL,
  `order_life` VARCHAR(45) NULL,
  `gtd_value` VARCHAR(45) NULL,
  `status` TINYINT(1) NULL DEFAULT 1,
  `created_by` INT(11) NULL DEFAULT 0,
  `updated_by` INT(11) NULL DEFAULT 0,
  `created_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_pre_trade_info_id`),
  UNIQUE INDEX `created_by_UNIQUE` (`created_by` ASC) VISIBLE);

CREATE TABLE `uni_solution`.`client_trades` (
  `client_trade_id` INT(11) NOT NULL AUTO_INCREMENT,
  `organization_id` INT(11) NOT NULL,
  `client_id` INT(11) NOT NULL,
  `client_code` VARCHAR(50) NOT NULL,
  `pre_tades_file_id` INT(11) NOT NULL,
  `is_email_sent` TINYINT(1) NULL DEFAULT 0,
  `is_email_received` TINYINT(1) NULL DEFAULT 0,
  `email_proof` VARCHAR(500) NULL DEFAULT NULL,
  `status` TINYINT(1) NULL DEFAULT 1,
  `created_by` INT(11) NULL DEFAULT 0,
  `updated_by` INT(11) NULL DEFAULT 0,
  `created_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_date` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`client_trade_id`));
