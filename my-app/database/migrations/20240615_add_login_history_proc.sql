-- Create a stored procedure to record login history with proper type casting
CREATE OR REPLACE FUNCTION record_login_history(
  p_user_id UUID,
  p_login_at TIMESTAMP WITH TIME ZONE,
  p_ip_address TEXT,
  p_device TEXT,
  p_location TEXT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_id INTEGER;
BEGIN
  -- Insert the record with explicit type casting from UUID to TEXT
  INSERT INTO login_history (
    user_id,
    login_at,
    ip_address,
    device,
    location,
    created_at
  ) VALUES (
    p_user_id::TEXT,  -- Explicit cast from UUID to TEXT
    p_login_at,
    p_ip_address,
    p_device,
    p_location,
    NOW()
  )
  RETURNING id INTO v_id;
  
  -- Fetch and return the inserted record
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'login_at', login_at,
    'ip_address', ip_address,
    'device', device,
    'location', location,
    'created_at', created_at
  ) INTO v_result
  FROM login_history
  WHERE id = v_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 