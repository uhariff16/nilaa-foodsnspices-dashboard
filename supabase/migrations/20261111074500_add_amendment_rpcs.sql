CREATE OR REPLACE FUNCTION public.acknowledge_transaction_amendment(
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

    IF v_amend.status != 'pending_acknowledgment' THEN
        RAISE EXCEPTION 'Amendment % is not pending (current status: %)', p_amendment_id, v_amend.status;
    END IF;

    -- Update transaction if transaction_id is present
    IF v_amend.transaction_id IS NOT NULL THEN
        IF v_amend.field_name = 'amount' AND v_amend.new_value IS NOT NULL THEN
            UPDATE public.transactions
            SET amount = v_amend.new_value::NUMERIC,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        ELSIF v_amend.field_name = 'quantity' AND v_amend.new_value IS NOT NULL THEN
            UPDATE public.transactions
            SET quantity = v_amend.new_value::NUMERIC,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        ELSIF v_amend.field_name = 'date' AND v_amend.new_value IS NOT NULL THEN
            UPDATE public.transactions
            SET date = v_amend.new_value::DATE,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        ELSIF v_amend.field_name = 'customer_name' AND v_amend.new_value IS NOT NULL THEN
            UPDATE public.transactions
            SET customer_name = v_amend.new_value,
                updated_at = now()
            WHERE id = v_amend.transaction_id;
        END IF;
    END IF;

    -- Mark amendment as acknowledged
    UPDATE public.transaction_amendments
    SET status = 'acknowledged',
        acknowledged_at = now(),
        acknowledged_by = COALESCE(p_actor, 'Admin')
    WHERE id = p_amendment_id;

    RETURN jsonb_build_object('success', true, 'amendment_id', p_amendment_id, 'status', 'acknowledged');
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_transaction_amendment(
    p_amendment_id UUID,
    p_actor TEXT DEFAULT 'Admin',
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.transaction_amendments
    SET status = 'rejected',
        acknowledged_at = now(),
        acknowledged_by = COALESCE(p_actor, 'Admin'),
        notes = CASE 
            WHEN p_reason IS NOT NULL THEN COALESCE(notes || ' | ', '') || 'Rejected: ' || p_reason
            ELSE COALESCE(notes || ' | ', '') || 'Rejected by manager'
        END
    WHERE id = p_amendment_id;

    RETURN jsonb_build_object('success', true, 'amendment_id', p_amendment_id, 'status', 'rejected');
END;
$$;

GRANT EXECUTE ON FUNCTION public.acknowledge_transaction_amendment TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reject_transaction_amendment TO anon, authenticated;
