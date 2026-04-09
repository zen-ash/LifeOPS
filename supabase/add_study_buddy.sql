-- ================================================================
-- Phase 6A: Study Buddy Foundation
-- Run this in Supabase Dashboard → SQL Editor
-- ================================================================

-- 1. study_buddies table
--    requester sends a request to addressee; status tracks lifecycle
CREATE TABLE IF NOT EXISTS public.study_buddies (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  addressee_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  -- Prevent self-buddy and duplicate relationships in the same direction
  CONSTRAINT no_self_buddy CHECK (requester_user_id != addressee_user_id),
  CONSTRAINT unique_buddy_pair UNIQUE (requester_user_id, addressee_user_id)
);

ALTER TABLE public.study_buddies ENABLE ROW LEVEL SECURITY;

-- SELECT: either party can see the relationship
CREATE POLICY "Users can see own buddy relationships"
  ON public.study_buddies FOR SELECT
  USING (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id);

-- INSERT: only the requester can create a request
CREATE POLICY "Users can send buddy requests"
  ON public.study_buddies FOR INSERT
  WITH CHECK (auth.uid() = requester_user_id);

-- UPDATE: either party can update (server actions enforce who can do what)
CREATE POLICY "Involved users can update buddy status"
  ON public.study_buddies FOR UPDATE
  USING (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id);

-- DELETE: either party can remove the relationship (cancel or unfriend)
CREATE POLICY "Involved users can remove buddy relationships"
  ON public.study_buddies FOR DELETE
  USING (auth.uid() = requester_user_id OR auth.uid() = addressee_user_id);


-- 2. Secure email lookup — SECURITY DEFINER so it can access auth.users
--    Returns only the user's id for an exact email match; prevents enumeration.
CREATE OR REPLACE FUNCTION public.find_user_by_email(search_email TEXT)
RETURNS TABLE(id UUID)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM auth.users
  WHERE LOWER(email) = LOWER(TRIM(search_email))
  LIMIT 1;
$$;

-- Only authenticated users may call this function
GRANT EXECUTE ON FUNCTION public.find_user_by_email(TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.find_user_by_email(TEXT) FROM anon;


-- 3. Allow users to view profiles of anyone they have a buddy relationship with
--    (pending OR accepted) so requester/addressee names are always resolvable.
--    The existing "Users can view own profile" policy (auth.uid() = id) still applies.
CREATE POLICY "Users can view buddy profiles"
  ON public.profiles FOR SELECT
  USING (
    id IN (
      SELECT CASE
        WHEN requester_user_id = auth.uid() THEN addressee_user_id
        ELSE requester_user_id
      END
      FROM public.study_buddies
      WHERE requester_user_id = auth.uid() OR addressee_user_id = auth.uid()
    )
  );
