CREATE DATABASE IF NOT EXISTS food_school;
USE food_school;

-- =========================================================
-- 1. ROLES
-- =========================================================

CREATE TABLE roles (
    id_role INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description VARCHAR(500)
) ENGINE=InnoDB;


-- =========================================================
-- 2. CATEGORÍAS DE PRODUCTOS
-- =========================================================

CREATE TABLE product_categories (
    id_category INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
) ENGINE=InnoDB;


-- =========================================================
-- 3. CATÁLOGO DE PRODUCTOS
-- =========================================================

CREATE TABLE product_catalog (
    id_product INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    id_category INT NOT NULL,

    CONSTRAINT fk_product_category
        FOREIGN KEY (id_category)
        REFERENCES product_categories(id_category)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
) ENGINE=InnoDB;


-- =========================================================
-- 4. CREDENCIALES DE USUARIO
-- =========================================================

CREATE TABLE user_credentials (
    id_credential INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
) ENGINE=InnoDB;


-- =========================================================
-- 5. PERFIL DE USUARIO
-- =========================================================

CREATE TABLE user_profiles (
    id_profile INT AUTO_INCREMENT PRIMARY KEY,
    cedula VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    id_role INT NOT NULL,
    id_credential INT NOT NULL UNIQUE,

    CONSTRAINT fk_profile_role
        FOREIGN KEY (id_role)
        REFERENCES roles(id_role)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_profile_credentials
        FOREIGN KEY (id_credential)
        REFERENCES user_credentials(id_credential)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
) ENGINE=InnoDB;


-- =========================================================
-- 6. INVENTARIO POR LOTES
-- =========================================================

CREATE TABLE batch_inventory (
    id_batch_inventory INT AUTO_INCREMENT PRIMARY KEY,
    id_product INT NOT NULL,
    total_quantity INT NOT NULL,
    entry_date DATE NOT NULL,
    expiration_date DATE NOT NULL,

    CONSTRAINT fk_batch_product
        FOREIGN KEY (id_product)
        REFERENCES product_catalog(id_product)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
) ENGINE=InnoDB;


-- =========================================================
-- 7. ASISTENCIA DIARIA
-- =========================================================

CREATE TABLE daily_attendance (
    id_daily_attendance INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    student_quantity INT NOT NULL
) ENGINE=InnoDB;


-- =========================================================
-- 8. ENTREGAS DIARIAS
-- =========================================================

CREATE TABLE daily_deliveries (
    id_daily_deliveries INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    id_batch_inventory INT NOT NULL,
    quantity_delivered INT NOT NULL,
    id_profile INT NOT NULL,

    CONSTRAINT fk_delivery_batch
        FOREIGN KEY (id_batch_inventory)
        REFERENCES batch_inventory(id_batch_inventory)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION,

    CONSTRAINT fk_delivery_profile
        FOREIGN KEY (id_profile)
        REFERENCES user_profiles(id_profile)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
) ENGINE=InnoDB;


-- =========================================================
-- 9. DECREASE
-- =========================================================

CREATE TABLE decrease (
    id_decrease INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    id_batch_inventory INT NOT NULL,
    quantity_leftover INT NOT NULL,
    reason VARCHAR(500),

    CONSTRAINT fk_decrease_batch
        FOREIGN KEY (id_batch_inventory)
        REFERENCES batch_inventory(id_batch_inventory)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION
) ENGINE=InnoDB;