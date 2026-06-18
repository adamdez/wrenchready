-- Remove the stale Al Boreland project schema from the shared Supabase
-- database. This schema is not used by the WrenchReady app and was producing
-- unrelated advisor findings for tables that are no longer maintained.
drop schema if exists al_boreland cascade;
