-- --------------------------------------------------------
-- Host:                         10.100.49.104
-- Server version:               5.7.19-log - MySQL Community Server (GPL)
-- Server OS:                    Win64
-- HeidiSQL Version:             9.4.0.5156
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


-- Dumping database structure for sams_prod
CREATE DATABASE IF NOT EXISTS `sams_prod` /*!40100 DEFAULT CHARACTER SET utf8 */;
USE `sams_prod`;

-- Dumping structure for table sams_prod.screenshots
CREATE TABLE IF NOT EXISTS `screenshots` (
  `GUID` varchar(45) NOT NULL,
  `smpsessionId` varchar(60) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `flowName` text,
  `stepName` text,
  `imageData` longtext NOT NULL,
  `retain` varchar(1) DEFAULT NULL,
  PRIMARY KEY (`GUID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
-- Dumping structure for procedure sams_prod.Stalled AWS Flows
DELIMITER //
CREATE DEFINER=`reporting`@`%` PROCEDURE `Stalled AWS Flows`(
	IN `Stalled_Time` INT,
	IN `Start_Date` TIMESTAMP,
	IN `Stop_Date` TIMESTAMP
)
    COMMENT 'Get Listing of Stalled AWS Flows with count of ocurrances between dates and with variable time selection'
BEGIN
	SELECT count(*) AS Count, Round(AVG(warning_threshold),2) AS Warn_Duration, flow_name, step_name
	FROM stalled_step_warning_log 
	WHERE work_source != "AWS Training Simulator" 
	AND warning_threshold >= Stalled_Time
	AND (business_line="TSC" 
	OR business_line="TSCNOC" 
	OR business_line="AWE_WIFI_Stay_Cnnct_Pr" 
	OR business_line ="AWE_WIFI_NOC_Info" 
	OR business_line = "UA_WIFI_TOC_MCD_PRI" 
	OR task_type like "AWS%") 
	AND timestamp >= Start_Date
	AND timestamp <= Stop_Date 
	GROUP BY step_name 
	ORDER by COUNT Desc;
END//
DELIMITER ;

-- Dumping structure for procedure sams_prod.Stalled Flows For Prior Day
DELIMITER //
CREATE DEFINER=`reporting`@`%` PROCEDURE `Stalled Flows For Prior Day`(
	IN `Days` INT
)
    COMMENT 'Retrieves Flows that are showing as stalled for the previous day'
BEGIN
		SELECT count(*) AS COUNT, Round(AVG(warning_threshold),2) AS AVERAGE_STALLED_STEP_TIME, flow_name AS FLOW_NAME, step_name AS STEP_NAME 
		FROM stalled_step_warning_log
		WHERE work_source != "AWS Training Simulator"
		AND warning_threshold >= "5"
		AND timestamp >= CONCAT(CURDATE() - INTERVAL Days DAY, ' 00:00:01')
		AND timestamp <= CONCAT(CURDATE() - INTERVAL 1 DAY, ' 23:59:00')
		GROUP BY step_name ORDER by COUNT Desc;
END//
DELIMITER ;

-- Dumping structure for table sams_prod.stalled_flow_warning_log
CREATE TABLE IF NOT EXISTS `stalled_flow_warning_log` (
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `smp_session_id` varchar(65) NOT NULL,
  `att_uid` varchar(6) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `work_source` varchar(30) DEFAULT NULL,
  `business_line` varchar(50) DEFAULT NULL,
  `task_type` varchar(50) DEFAULT NULL,
  `manager_uid` varchar(6) DEFAULT NULL,
  `flow_started` timestamp NULL DEFAULT NULL,
  `warning_threshold` int(11) DEFAULT NULL,
  PRIMARY KEY (`smp_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
-- Dumping structure for table sams_prod.stalled_step_warning_log
CREATE TABLE IF NOT EXISTS `stalled_step_warning_log` (
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `smp_session_id` varchar(65) NOT NULL,
  `att_uid` varchar(6) NOT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `work_source` varchar(30) DEFAULT NULL,
  `business_line` varchar(50) DEFAULT NULL,
  `task_type` varchar(50) DEFAULT NULL,
  `manager_uid` varchar(6) DEFAULT NULL,
  `step_started` timestamp NULL DEFAULT '0000-00-00 00:00:00',
  `flow_name` varchar(100) NOT NULL,
  `step_name` varchar(100) NOT NULL,
  `warning_threshold` int(11) NOT NULL,
  PRIMARY KEY (`smp_session_id`,`flow_name`,`step_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
-- Dumping structure for table sams_prod.stored_detail_view
CREATE TABLE IF NOT EXISTS `stored_detail_view` (
  `GUID` varchar(36) DEFAULT NULL,
  `attuid` varchar(6) DEFAULT NULL,
  `first_name` varchar(50) DEFAULT NULL,
  `last_name` varchar(50) DEFAULT NULL,
  `savedate` timestamp NULL DEFAULT NULL,
  `smpsessionId` varchar(60) DEFAULT NULL,
  `headerInfo` longtext,
  `stepHistory` longtext,
  `imageTimestamp` varchar(10) DEFAULT NULL,
  `imageData` longtext,
  `dictionaryTimestamp` varchar(10) DEFAULT NULL,
  `dictionaryData` longtext
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

-- Data exporting was unselected.
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
