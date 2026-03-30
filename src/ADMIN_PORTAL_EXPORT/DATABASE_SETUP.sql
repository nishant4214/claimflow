-- ============================================================================
-- ADMIN PORTAL - COMPLETE PostgreSQL DATABASE SCHEMA
-- ============================================================================
-- Purpose: Complete schema for independent admin portal
-- Run this in PostgreSQL or DBeaver

-- Create database first (if not exists)
-- CREATE DATABASE admin_portal_db;

-- ============================================================================
-- ROLES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  display_label VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name, display_label, description) VALUES
  ('employee', 'Employee', 'Regular employee - can submit claims'),
  ('junior_admin', 'Junior Admin', 'Can verify claims'),
  ('manager', 'Manager', 'Can approve claims'),
  ('admin_head', 'Admin Head', 'Can approve and manage admins'),
  ('finance', 'Finance', 'Can process payments'),
  ('super_admin', 'Super Admin', 'Full system access');

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  portal_role VARCHAR(50) NOT NULL REFERENCES roles(name),
  department VARCHAR(100),
  designation VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_portal_role ON users(portal_role);

INSERT INTO users (email, password_hash, full_name, portal_role, department, designation) VALUES
  ('admin@portal.com', '$2b$10$YourHashedPasswordHere', 'Admin User', 'super_admin', 'Admin', 'System Admin'),
  ('employee@portal.com', '$2b$10$YourHashedPasswordHere', 'John Employee', 'employee', 'Sales', 'Executive'),
  ('manager@portal.com', '$2b$10$YourHashedPasswordHere', 'Jane Manager', 'manager', 'Sales', 'Manager'),
  ('finance@portal.com', '$2b$10$YourHashedPasswordHere', 'Bob Finance', 'finance', 'Finance', 'Officer');

-- ============================================================================
-- CATEGORIES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  title VARCHAR(100) NOT NULL,
  bill_required BOOLEAN DEFAULT true,
  policy_limit DECIMAL(10, 2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categories (category_name, title, bill_required, policy_limit) VALUES
  ('Travel Expenses', 'OLA/Uber', true, 5000),
  ('Travel Expenses', 'Flight', true, 50000),
  ('Meals', 'Client Meeting', true, 2000),
  ('Meals', 'Team Lunch', true, 1000),
  ('Office Supplies', 'Stationery', true, 500);

-- ============================================================================
-- CLAIMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS claims (
  id SERIAL PRIMARY KEY,
  claim_number VARCHAR(50) UNIQUE,
  employee_id INT NOT NULL REFERENCES users(id),
  employee_email VARCHAR(255),
  department VARCHAR(100),
  expense_date_from DATE NOT NULL,
  expense_date_to DATE NOT NULL,
  purpose TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  category_id INT REFERENCES categories(id),
  category_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'draft',
  current_approver_role VARCHAR(50),
  rejection_reason TEXT,
  send_back_reason TEXT,
  payment_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claims_employee ON claims(employee_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_number ON claims(claim_number);

-- ============================================================================
-- CLAIM ITEMS TABLE (Bill details)
-- ============================================================================
CREATE TABLE IF NOT EXISTS claim_items (
  id SERIAL PRIMARY KEY,
  claim_id INT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  document_url VARCHAR(500),
  purpose TEXT,
  bill_number VARCHAR(100),
  bill_date DATE,
  bill_amount DECIMAL(12, 2),
  currency VARCHAR(10) DEFAULT 'INR',
  payment_mode VARCHAR(50),
  ocr_extracted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_claim_items_claim ON claim_items(claim_id);

-- ============================================================================
-- APPROVAL WORKFLOW TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS approvals (
  id SERIAL PRIMARY KEY,
  claim_id INT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  approver_id INT REFERENCES users(id),
  approver_role VARCHAR(50),
  stage VARCHAR(50),
  action VARCHAR(50),
  remarks TEXT,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_approvals_claim ON approvals(claim_id);
CREATE INDEX idx_approvals_approver ON approvals(approver_id);

-- ============================================================================
-- WORKFLOW CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workflow_configs (
  id SERIAL PRIMARY KEY,
  workflow_type VARCHAR(50) NOT NULL,
  workflow_name VARCHAR(100),
  stages JSONB,
  sla_days INT DEFAULT 45,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO workflow_configs (workflow_type, workflow_name, stages, sla_days) VALUES
  ('normal', 'Normal Claim Workflow', 
    '[
      {"stage_order": 1, "stage_name": "verification", "approver_role": "junior_admin", "status_on_approve": "verified"},
      {"stage_order": 2, "stage_name": "manager_approval", "approver_role": "manager", "status_on_approve": "manager_approved"},
      {"stage_order": 3, "stage_name": "finance_approval", "approver_role": "finance", "status_on_approve": "approved"}
    ]', 45);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  recipient_email VARCHAR(255) NOT NULL,
  claim_id INT REFERENCES claims(id),
  notification_type VARCHAR(100),
  title VARCHAR(255),
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  email_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_email ON notifications(recipient_email);
CREATE INDEX idx_notifications_claim ON notifications(claim_id);

-- ============================================================================
-- SYSTEM CONFIG TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS system_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  config_type VARCHAR(50),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
  ('email_enabled', 'false', 'boolean', 'Enable/disable email notifications'),
  ('smtp_host', 'smtp.gmail.com', 'string', 'SMTP server host'),
  ('smtp_port', '587', 'string', 'SMTP server port'),
  ('default_sla_days', '45', 'number', 'Default SLA for claims'),
  ('max_claim_amount', '100000', 'number', 'Maximum claim amount allowed');

-- ============================================================================
-- CONFERENCE ROOMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS conference_rooms (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(50) UNIQUE NOT NULL,
  room_name VARCHAR(100) NOT NULL,
  seating_capacity INT,
  floor VARCHAR(20),
  category VARCHAR(50),
  amenities JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO conference_rooms (room_id, room_name, seating_capacity, floor, category) VALUES
  ('CR-001', 'Meeting Room A', 8, '1', 'Meeting Room'),
  ('CR-002', 'Meeting Room B', 12, '1', 'Meeting Room'),
  ('CR-003', 'Board Room', 20, '2', 'Board Room');

-- ============================================================================
-- ROOM BOOKINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS room_bookings (
  id SERIAL PRIMARY KEY,
  booking_number VARCHAR(50) UNIQUE,
  room_id INT NOT NULL REFERENCES conference_rooms(id),
  employee_id INT NOT NULL REFERENCES users(id),
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  meeting_title VARCHAR(255),
  purpose TEXT,
  attendees_count INT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_room_bookings_employee ON room_bookings(employee_id);
CREATE INDEX idx_room_bookings_room ON room_bookings(room_id);

-- ============================================================================
-- TRANSPORT REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transport_requests (
  id SERIAL PRIMARY KEY,
  tar_number VARCHAR(50) UNIQUE,
  employee_id INT NOT NULL REFERENCES users(id),
  employee_email VARCHAR(255),
  department VARCHAR(100),
  transport_type VARCHAR(50),
  business_justification TEXT,
  status VARCHAR(50) DEFAULT 'pending_manager',
  stage VARCHAR(50) DEFAULT 'manager',
  created_by_role VARCHAR(50),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transport_employee ON transport_requests(employee_id);
CREATE INDEX idx_transport_status ON transport_requests(status);

-- ============================================================================
-- CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to tables with updated_at
CREATE TRIGGER users_update_timestamp BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER claims_update_timestamp BEFORE UPDATE ON claims
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER workflow_configs_update_timestamp BEFORE UPDATE ON workflow_configs
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER system_config_update_timestamp BEFORE UPDATE ON system_config
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
-- Run these queries to verify all tables are created:
-- SELECT * FROM users;
-- SELECT * FROM roles;
-- SELECT * FROM categories;
-- SELECT * FROM claims;
-- SELECT * FROM workflow_configs;