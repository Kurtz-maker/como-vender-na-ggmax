-- Owner admin access is granted only to the confirmed owner e-mail (no more "first signup becomes admin").
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.email, new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  return new;
end; $$;

CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
begin
  if new.email_confirmed_at is not null and lower(new.email) = 'techutilbr@gmail.com' then
    insert into public.user_roles (user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
DROP TRIGGER IF EXISTS on_auth_user_owner_admin ON auth.users;
CREATE TRIGGER on_auth_user_owner_admin AFTER INSERT OR UPDATE OF email_confirmed_at, email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();

-- Gateway credentials: never readable from the browser, only by server code.
CREATE TABLE public.payment_gateway_secrets (
  gateway_id uuid PRIMARY KEY REFERENCES public.payment_gateways(id) ON DELETE CASCADE,
  access_token text,
  webhook_secret text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.payment_gateway_secrets TO service_role;
ALTER TABLE public.payment_gateway_secrets ENABLE ROW LEVEL SECURITY;

-- Promotional prices and plan images.
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS promo_price_cents integer,
  ADD COLUMN IF NOT EXISTS promo_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS promo_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS image_url text;

-- Free lessons and lesson cover images.
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_free boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS image_url text;

DROP POLICY IF EXISTS "lessons for entitled" ON public.lessons;
CREATE POLICY "lessons for entitled" ON public.lessons FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR (
    published AND EXISTS (
      SELECT 1 FROM public.modules m
      WHERE m.id = lessons.module_id AND m.published
        AND (lessons.is_free OR public.has_course_access(auth.uid(), m.required_plan))
    )
  )
);

CREATE INDEX IF NOT EXISTS payments_coupon_idx ON public.payments(coupon_id);
CREATE INDEX IF NOT EXISTS payments_user_plan_idx ON public.payments(user_id, plan);