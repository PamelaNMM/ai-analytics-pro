-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Apr 14, 2026 at 07:31 AM
-- Server version: 8.3.0
-- PHP Version: 8.2.18

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sales_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
CREATE TABLE IF NOT EXISTS `expenses` (
  `category` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `date` date DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `expenses`
--

INSERT INTO `expenses` (`category`, `amount`, `date`) VALUES
('Salaries', 85000.00, '2024-01-31'),
('Operations', 45000.00, '2024-01-31'),
('Marketing', 25000.00, '2024-01-31'),
('Utilities', 8500.00, '2024-01-31'),
('Travel', 12000.00, '2024-01-31'),
('Salaries', 85000.00, '2024-02-29'),
('Operations', 48000.00, '2024-02-29'),
('Marketing', 32000.00, '2024-02-29'),
('Utilities', 8500.00, '2024-02-29'),
('Travel', 15500.00, '2024-02-29'),
('Salaries', 85000.00, '2024-03-31'),
('Operations', 42000.00, '2024-03-31'),
('Marketing', 28000.00, '2024-03-31'),
('Utilities', 9000.00, '2024-03-31'),
('Travel', 18000.00, '2024-03-31'),
('Salaries', 85000.00, '2024-04-30'),
('Operations', 50000.00, '2024-04-30'),
('Marketing', 35000.00, '2024-04-30'),
('Utilities', 8500.00, '2024-04-30'),
('Travel', 12500.00, '2024-04-30'),
('Salaries', 85000.00, '2024-05-31'),
('Operations', 46000.00, '2024-05-31'),
('Marketing', 30000.00, '2024-05-31'),
('Utilities', 9000.00, '2024-05-31'),
('Travel', 16000.00, '2024-05-31'),
('Salaries', 85000.00, '2024-06-30'),
('Operations', 48000.00, '2024-06-30'),
('Marketing', 33000.00, '2024-06-30'),
('Utilities', 8500.00, '2024-06-30'),
('Travel', 14500.00, '2024-06-30');

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
CREATE TABLE IF NOT EXISTS `sales` (
  `clientname` varchar(255) DEFAULT NULL,
  `netsales` decimal(10,2) DEFAULT NULL,
  `shdate` date DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`clientname`, `netsales`, `shdate`, `country`) VALUES
('Acme Corporation', 125000.00, '2024-01-05', 'USA'),
('TechFlow Inc', 87500.50, '2024-01-10', 'Canada'),
('Global Solutions Ltd', 156200.00, '2024-01-15', 'UK'),
('Enterprise Plus', 234500.75, '2024-02-03', 'USA'),
('Digital Innovations', 98700.25, '2024-02-08', 'Germany'),
('BlueSky Industries', 167300.00, '2024-02-14', 'USA'),
('Quantum Systems', 201500.50, '2024-03-05', 'France'),
('NextGen Tech', 145800.00, '2024-03-12', 'USA'),
('Pacific Partners', 189700.25, '2024-03-20', 'Australia'),
('Summit Group', 212300.75, '2024-04-02', 'USA'),
('Aurora Solutions', 134200.00, '2024-04-10', 'Canada'),
('Nexus Digital', 198500.50, '2024-04-18', 'UK'),
('Velocity Corp', 176400.00, '2024-05-05', 'USA'),
('Phoenix Analytics', 220100.25, '2024-05-12', 'USA'),
('Sterling Enterprises', 156700.75, '2024-05-20', 'Germany'),
('Zenith Partners', 189300.00, '2024-06-03', 'USA'),
('Apex Innovations', 234500.50, '2024-06-10', 'Canada'),
('Prism Technology', 145600.00, '2024-06-18', 'USA');
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
