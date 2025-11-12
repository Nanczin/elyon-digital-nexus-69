ALTER TABLE checkouts 
ADD COLUMN layout text NOT NULL DEFAULT 'vertical';

COMMENT ON COLUMN checkouts.layout IS 'Layout do checkout: vertical, horizontal ou mosaico';