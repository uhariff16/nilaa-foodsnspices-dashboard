CREATE OR REPLACE FUNCTION public.revert_transaction_amendment(
    p_amendment_id UUID,
    p_actor TEXT DEFAULT 'Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_amend RECORD;
BEGIN
    SELECT * INTO v_amend 
    FROM public.transaction_amendments 
    WHERE id = p_amendment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Amendment % not found', p_amendment_id;
    END IF;

    IF v_amend.status != 'acknowledged' THEN
        RAISE EXCEPTION 'Only acknowledged amendments can be reverted (current status: %)', v_amend.status;
    END IF;

    -- Revert transaction back to old_value
    IF v_amend.transaction_id IS NOT NULL AND v_amend.old_value IS NOT NULL THEN
        IF v_amend.field_name = 'amount' THEN
            UPDATE public.transactions
            SET amount = v_amend.old_value::NUMERIC,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        ELSIF v_amend.field_name = 'quantity' THEN
            UPDATE public.transactions
            SET quantity = v_amend.old_value::NUMERIC,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        ELSIF v_amend.field_name = 'date' THEN
            UPDATE public.transactions
            SET date = v_amend.old_value::DATE,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        ELSIF v_amend.field_name = 'customer_name' THEN
            UPDATE public.transactions
            SET customer_name = v_amend.old_value,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        END IF;
    END IF;

    -- Update amendment status to reverted
    UPDATE public.transaction_amendments
    SET status = 'reverted',
        acknowledged_at = now(),
        acknowledged_by = COALESCE(p_actor, 'Admin'),
        notes = COALESCE(notes || ' | ', '') || 'Reverted back to original value by manager'
    WHERE id = p_amendment_id;

    RETURN jsonb_build_object('success', true, 'amendment_id', p_amendment_id, 'status', 'reverted');
END;
$$;

GRANT EXECUTE ON FUNCTION public.revert_transaction_amendment TO anon, authenticated;
