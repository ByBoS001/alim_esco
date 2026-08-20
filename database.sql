-- 1. TUS NUEVAS ESCUELAS
CREATE TABLE `schools` (
	`id_school` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) NOT NULL,
	`address` TEXT,
	`zone` VARCHAR(255)
);

-- 2. TUS ROLES FLEXIBLES
CREATE TABLE `roles` (
	`id_role` INT AUTO_INCREMENT PRIMARY KEY,
	`name` VARCHAR(255) NOT NULL UNIQUE,
	`description` TEXT
);

-- 3. CREDENCIALES SEPARADAS (Inicio de sesión)
CREATE TABLE `user_credentials` (
	`id_credential` INT AUTO_INCREMENT PRIMARY KEY,
	`email` VARCHAR(255) NOT NULL UNIQUE,
	`password_hash` TEXT NOT NULL
);

-- 4. LOS PERFILES DE USUARIO (Con su nueva FK a Schools opcional)
CREATE TABLE `user_profiles` (
	`id_profile` INT AUTO_INCREMENT PRIMARY KEY,
	`cedula` VARCHAR(255) NOT NULL UNIQUE,
	`name` VARCHAR(255) NOT NULL,
	`last_name` VARCHAR(255) NOT NULL,
	`phone` VARCHAR(255),
	`id_role` INT NOT NULL,
	`id_credential` INT NOT NULL UNIQUE,
	`id_school` INT,
    FOREIGN KEY (`id_role`) REFERENCES `roles`(`id_role`),
    FOREIGN KEY (`id_credential`) REFERENCES `user_credentials`(`id_credential`),
    FOREIGN KEY (`id_school`) REFERENCES `schools`(`id_school`)
);

-- 5. EL INVENTARIO POR LOTE (Obligado a pertenecer a una escuela)
CREATE TABLE `batch_inventory` (
	`id_batch_inventory` INT AUTO_INCREMENT PRIMARY KEY,
	`id_product` INT NOT NULL, -- Asumiendo que crearás product_catalog u homólogo
	`total_quantity` INT NOT NULL,
	`entry_date` DATE NOT NULL,
	`expiration_date` DATE NOT NULL,
	`id_school` INT NOT NULL,
    FOREIGN KEY (`id_school`) REFERENCES `schools`(`id_school`)
);

-- 6. ASISTENCIA DIARIA (Aislada por escuela)
CREATE TABLE `daily_attendance` (
	`id_daily_attendance` INT AUTO_INCREMENT PRIMARY KEY,
	`date` DATE NOT NULL,
	`student_quantity` INT NOT NULL,
	`id_school` INT NOT NULL,
    FOREIGN KEY (`id_school`) REFERENCES `schools`(`id_school`)
);

-- 7. ENTREGAS DIARIAS (Aisladas por escuela y rasteadas por perfil de usuario)
CREATE TABLE `daily_deliveries` (
	`id_daily_deliveries` INT AUTO_INCREMENT PRIMARY KEY,
	`date` DATE NOT NULL,
	`id_batch_inventory` INT NOT NULL,
	`quantity_delivered` INT NOT NULL,
	`id_school` INT NOT NULL,
	`id_profile` INT NOT NULL,
    FOREIGN KEY (`id_batch_inventory`) REFERENCES `batch_inventory`(`id_batch_inventory`),
    FOREIGN KEY (`id_school`) REFERENCES `schools`(`id_school`),
    FOREIGN KEY (`id_profile`) REFERENCES `user_profiles`(`id_profile`)
);

-- 8. MERMAS Y SOBRANTES (Aislados por escuela)
CREATE TABLE `decrease` (
	`id_decrease` INT AUTO_INCREMENT PRIMARY KEY,
	`date` DATE NOT NULL,
	`id_batch_inventory` INT NOT NULL,
	`quantity_leftover` INT NOT NULL,
	`reason` TEXT,
	`id_school` INT NOT NULL,
    FOREIGN KEY (`id_batch_inventory`) REFERENCES `batch_inventory`(`id_batch_inventory`),
    FOREIGN KEY (`id_school`) REFERENCES `schools`(`id_school`)
);