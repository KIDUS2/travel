-- Feature: privacy controls. Who can see a new memory unless the traveler picks otherwise.
ALTER TABLE app_users ADD COLUMN default_privacy VARCHAR(10) NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE app_users ADD CONSTRAINT app_users_default_privacy_ck CHECK (default_privacy IN ('PRIVATE', 'FAMILY', 'PUBLIC'));
