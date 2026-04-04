
DROP POLICY "Users can view all profiles" ON profiles;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
