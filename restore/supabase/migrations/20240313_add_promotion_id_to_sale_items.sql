ALTER TABLE sale_items ADD COLUMN promotion_id UUID REFERENCES promotions(id);
