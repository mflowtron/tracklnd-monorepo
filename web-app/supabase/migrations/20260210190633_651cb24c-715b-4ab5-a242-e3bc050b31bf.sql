
CREATE OR REPLACE FUNCTION public.recalculate_all_snapshots(p_config_id UUID)
RETURNS VOID AS $$
DECLARE
  v_meet_pool NUMERIC(12,2);
  v_meet_seed NUMERIC(12,2);
  v_meet_refunds NUMERIC(12,2);
  v_total_contributions INT;
  v_event_distributable NUMERIC(12,2);
  v_direct_event NUMERIC(12,2);
  v_event_refunds NUMERIC(12,2);
  v_event_seed NUMERIC(12,2);
  v_place_seed NUMERIC(12,2);
  v_place_total NUMERIC(12,2);
  v_event_total NUMERIC(12,2);
  v_grand_total NUMERIC(12,2) := 0;
  rec_event RECORD;
  rec_place RECORD;
BEGIN
  SELECT COALESCE(SUM(purse_amount), 0) INTO v_meet_pool
  FROM purse_contributions
  WHERE config_id = p_config_id
    AND source_type IN ('ppv_ticket', 'direct_meet');

  SELECT COALESCE(SUM(r.refund_amount), 0) INTO v_meet_refunds
  FROM purse_refunds r
  JOIN purse_contributions c ON c.id = r.contribution_id
  WHERE c.config_id = p_config_id
    AND c.source_type IN ('ppv_ticket', 'direct_meet');

  SELECT COALESCE(SUM(amount), 0) INTO v_meet_seed
  FROM purse_seed_money
  WHERE config_id = p_config_id
    AND event_allocation_id IS NULL
    AND place_allocation_id IS NULL;

  v_meet_pool := v_meet_pool - v_meet_refunds + v_meet_seed;

  SELECT COUNT(*) INTO v_total_contributions
  FROM purse_contributions WHERE config_id = p_config_id;

  FOR rec_event IN
    SELECT id, meet_pct FROM event_purse_allocations WHERE config_id = p_config_id
  LOOP
    SELECT COALESCE(SUM(purse_amount), 0) INTO v_direct_event
    FROM purse_contributions
    WHERE config_id = p_config_id
      AND source_type = 'direct_event'
      AND event_allocation_id = rec_event.id;

    SELECT COALESCE(SUM(r.refund_amount), 0) INTO v_event_refunds
    FROM purse_refunds r
    JOIN purse_contributions c ON c.id = r.contribution_id
    WHERE c.config_id = p_config_id
      AND c.source_type = 'direct_event'
      AND c.event_allocation_id = rec_event.id;

    SELECT COALESCE(SUM(amount), 0) INTO v_event_seed
    FROM purse_seed_money
    WHERE event_allocation_id = rec_event.id
      AND place_allocation_id IS NULL;

    v_event_distributable := (v_meet_pool * rec_event.meet_pct / 100)
                           + (v_direct_event - v_event_refunds)
                           + v_event_seed;

    v_event_total := 0;

    FOR rec_place IN
      SELECT id, event_pct FROM place_purse_allocations
      WHERE event_allocation_id = rec_event.id ORDER BY place
    LOOP
      SELECT COALESCE(SUM(amount), 0) INTO v_place_seed
      FROM purse_seed_money WHERE place_allocation_id = rec_place.id;

      v_place_total := (v_event_distributable * rec_place.event_pct / 100) + v_place_seed;
      v_event_total := v_event_total + v_place_total;

      INSERT INTO purse_snapshots
        (config_id, scope_type, event_allocation_id, place_allocation_id,
         cached_total, contribution_count, last_updated)
      VALUES
        (p_config_id, 'place', rec_event.id, rec_place.id, v_place_total, 0, now())
      ON CONFLICT (config_id, scope_type, event_allocation_id, place_allocation_id)
      DO UPDATE SET cached_total = EXCLUDED.cached_total, last_updated = now();
    END LOOP;

    INSERT INTO purse_snapshots
      (config_id, scope_type, event_allocation_id, place_allocation_id,
       cached_total, contribution_count, last_updated)
    VALUES
      (p_config_id, 'event', rec_event.id, NULL, v_event_total, 0, now())
    ON CONFLICT (config_id, scope_type, event_allocation_id, place_allocation_id)
    DO UPDATE SET cached_total = EXCLUDED.cached_total, last_updated = now();

    v_grand_total := v_grand_total + v_event_total;
  END LOOP;

  INSERT INTO purse_snapshots
    (config_id, scope_type, event_allocation_id, place_allocation_id,
     cached_total, contribution_count, last_updated)
  VALUES
    (p_config_id, 'meet', NULL, NULL, v_grand_total, v_total_contributions, now())
  ON CONFLICT (config_id, scope_type, event_allocation_id, place_allocation_id)
  DO UPDATE SET cached_total = EXCLUDED.cached_total,
               contribution_count = EXCLUDED.contribution_count,
               last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger 1: contribution inserted
CREATE OR REPLACE FUNCTION public.trg_fn_contribution_inserted()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_all_snapshots(NEW.config_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_contribution_inserted
  AFTER INSERT ON public.purse_contributions
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_contribution_inserted();

-- Trigger 2: seed changed
CREATE OR REPLACE FUNCTION public.trg_fn_seed_changed()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_all_snapshots(COALESCE(NEW.config_id, OLD.config_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_seed_changed
  AFTER INSERT OR UPDATE OR DELETE ON public.purse_seed_money
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_seed_changed();

-- Trigger 3: refund inserted
CREATE OR REPLACE FUNCTION public.trg_fn_refund_inserted()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_all_snapshots(NEW.config_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_refund_inserted
  AFTER INSERT ON public.purse_refunds
  FOR EACH ROW EXECUTE FUNCTION public.trg_fn_refund_inserted();
