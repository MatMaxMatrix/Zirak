-- Function to check if a profile exists by UUID 
-- Handles type casting between UUID and TEXT
CREATE OR REPLACE FUNCTION check_profile_exists(p_user_id UUID) 
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM profiles WHERE id = p_user_id::TEXT
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a profile with proper type casting
CREATE OR REPLACE FUNCTION create_profile(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT DEFAULT '',
  p_picture TEXT DEFAULT '',
  p_bio TEXT DEFAULT '',
  p_phone_number TEXT DEFAULT '',
  p_city TEXT DEFAULT ''
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Insert the profile with explicit casting from UUID to TEXT
  INSERT INTO profiles (
    id,
    email,
    name,
    picture,
    bio,
    phone_number,
    city,
    created_at,
    updated_at
  ) VALUES (
    p_user_id::TEXT,  -- Explicit cast from UUID to TEXT
    p_email,
    p_name,
    p_picture,
    p_bio,
    p_phone_number,
    p_city,
    NOW(),
    NOW()
  )
  RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'name', name,
    'picture', picture,
    'bio', bio,
    'phone_number', phone_number,
    'city', city,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get a profile by UUID with proper type casting
CREATE OR REPLACE FUNCTION get_profile_by_id(p_user_id UUID) 
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'email', email,
    'name', name,
    'picture', picture,
    'bio', bio,
    'phone_number', phone_number,
    'city', city,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM profiles
  WHERE id = p_user_id::TEXT;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update a profile with proper type casting
CREATE OR REPLACE FUNCTION update_profile(
  p_user_id UUID,
  p_name TEXT DEFAULT NULL,
  p_picture TEXT DEFAULT NULL,
  p_bio TEXT DEFAULT NULL,
  p_phone_number TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the profile with selective updates for non-null parameters
  UPDATE profiles
  SET 
    name = COALESCE(p_name, name),
    picture = COALESCE(p_picture, picture),
    bio = COALESCE(p_bio, bio),
    phone_number = COALESCE(p_phone_number, phone_number),
    city = COALESCE(p_city, city),
    updated_at = NOW()
  WHERE id = p_user_id::TEXT
  RETURNING jsonb_build_object(
    'id', id,
    'email', email,
    'name', name,
    'picture', picture,
    'bio', bio,
    'phone_number', phone_number,
    'city', city,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 