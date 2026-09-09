-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.seat_type AS ENUM ('premium', 'normal');
CREATE TYPE public.seat_status AS ENUM ('available', 'booked');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE public.booking_status AS ENUM ('confirmed', 'cancelled');

-- MOVIES
CREATE TABLE public.movies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  genre text NOT NULL DEFAULT '',
  duration integer NOT NULL DEFAULT 120,
  rating numeric(3,1) NOT NULL DEFAULT 0,
  poster text NOT NULL DEFAULT '',
  language text NOT NULL DEFAULT 'English',
  release_date date,
  trailer_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- THEATRES
CREATE TABLE public.theatres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL DEFAULT '',
  amenity text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SHOWS
CREATE TABLE public.shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  theatre_id uuid NOT NULL REFERENCES public.theatres(id) ON DELETE CASCADE,
  show_date date NOT NULL,
  show_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (movie_id, theatre_id, show_date, show_time)
);

-- SEATS
CREATE TABLE public.seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  seat_number text NOT NULL,
  seat_type public.seat_type NOT NULL DEFAULT 'normal',
  price numeric(10,2) NOT NULL DEFAULT 180,
  status public.seat_status NOT NULL DEFAULT 'available',
  UNIQUE (show_id, seat_number)
);
CREATE INDEX seats_show_idx ON public.seats(show_id);

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- BOOKINGS
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  show_id uuid NOT NULL REFERENCES public.shows(id) ON DELETE RESTRICT,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_status public.payment_status NOT NULL DEFAULT 'pending',
  booking_status public.booking_status NOT NULL DEFAULT 'confirmed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_user_idx ON public.bookings(user_id);

CREATE TABLE public.booking_seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  seat_id uuid NOT NULL REFERENCES public.seats(id) ON DELETE RESTRICT,
  price numeric(10,2) NOT NULL DEFAULT 0
);
CREATE INDEX booking_seats_booking_idx ON public.booking_seats(booking_id);

-- WATCHLIST
CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  movie_id uuid NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, movie_id)
);

-- GRANTS
GRANT SELECT ON public.movies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.movies TO authenticated;
GRANT ALL ON public.movies TO service_role;

GRANT SELECT ON public.theatres TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.theatres TO authenticated;
GRANT ALL ON public.theatres TO service_role;

GRANT SELECT ON public.shows TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shows TO authenticated;
GRANT ALL ON public.shows TO service_role;

GRANT SELECT ON public.seats TO anon, authenticated;
GRANT UPDATE ON public.seats TO authenticated;
GRANT ALL ON public.seats TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

GRANT SELECT, INSERT ON public.booking_seats TO authenticated;
GRANT ALL ON public.booking_seats TO service_role;

GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;

-- ROLE HELPER
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- RLS
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Movies are viewable by everyone" ON public.movies FOR SELECT USING (true);
CREATE POLICY "Admins manage movies" ON public.movies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.theatres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Theatres are viewable by everyone" ON public.theatres FOR SELECT USING (true);
CREATE POLICY "Admins manage theatres" ON public.theatres FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.shows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shows are viewable by everyone" ON public.shows FOR SELECT USING (true);
CREATE POLICY "Admins manage shows" ON public.shows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seats are viewable by everyone" ON public.seats FOR SELECT USING (true);
CREATE POLICY "Admins manage seats" ON public.seats FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.booking_seats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own booking seats" ON public.booking_seats FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_seats.booking_id
    AND (b.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));

ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own watchlist" ON public.watchlist FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- AUTO PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data ->> 'phone'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- AUTO SEAT GENERATION FOR EVERY SHOW
CREATE OR REPLACE FUNCTION public.generate_seats_for_show()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r text;
  n integer;
BEGIN
  FOREACH r IN ARRAY ARRAY['A','B','C','D','E','F','G','H','I'] LOOP
    FOR n IN 1..12 LOOP
      INSERT INTO public.seats (show_id, seat_number, seat_type, price, status)
      VALUES (
        NEW.id,
        r || n::text,
        CASE WHEN r IN ('A','B') THEN 'premium'::public.seat_type ELSE 'normal'::public.seat_type END,
        CASE WHEN r IN ('A','B') THEN 280 ELSE 180 END,
        'available'
      );
    END LOOP;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_show_created
AFTER INSERT ON public.shows
FOR EACH ROW EXECUTE FUNCTION public.generate_seats_for_show();

-- ATOMIC BOOKING
CREATE OR REPLACE FUNCTION public.create_booking(
  p_show_id uuid,
  p_seat_ids uuid[],
  p_discount numeric DEFAULT 0
)
RETURNS TABLE (booking_uuid uuid, reference text, total numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
  v_available integer;
  v_tickets numeric;
  v_fee numeric;
  v_gst numeric;
  v_total numeric;
  v_ref text;
  v_booking uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to book tickets.';
  END IF;

  v_count := COALESCE(array_length(p_seat_ids, 1), 0);
  IF v_count < 1 THEN
    RAISE EXCEPTION 'Please select at least one seat.';
  END IF;
  IF v_count > 8 THEN
    RAISE EXCEPTION 'You cannot book more than 8 seats.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.shows WHERE id = p_show_id) THEN
    RAISE EXCEPTION 'Show is no longer available.';
  END IF;

  PERFORM 1 FROM public.seats WHERE id = ANY(p_seat_ids) ORDER BY id FOR UPDATE;

  SELECT count(*) INTO v_available
  FROM public.seats
  WHERE id = ANY(p_seat_ids) AND show_id = p_show_id AND status = 'available';

  IF v_available <> v_count THEN
    RAISE EXCEPTION 'Sorry, one or more selected seats are no longer available.';
  END IF;

  SELECT COALESCE(sum(price), 0) INTO v_tickets FROM public.seats WHERE id = ANY(p_seat_ids);
  v_fee := 25 * v_count;
  v_gst := round((v_tickets + v_fee) * 0.05, 2);
  v_total := greatest(v_tickets + v_fee + v_gst - GREATEST(COALESCE(p_discount, 0), 0), 0);

  v_ref := 'CB' || to_char(now(), 'YYYY') || upper(substr(md5(gen_random_uuid()::text), 1, 8));

  INSERT INTO public.bookings (booking_id, user_id, show_id, total_amount, payment_status, booking_status)
  VALUES (v_ref, v_user, p_show_id, v_total, 'paid', 'confirmed')
  RETURNING id INTO v_booking;

  INSERT INTO public.booking_seats (booking_id, seat_id, price)
  SELECT v_booking, s.id, s.price FROM public.seats s WHERE s.id = ANY(p_seat_ids);

  UPDATE public.seats SET status = 'booked' WHERE id = ANY(p_seat_ids);

  RETURN QUERY SELECT v_booking, v_ref, v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.create_booking(uuid, uuid[], numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.create_booking(uuid, uuid[], numeric) TO authenticated;

-- SEED DATA
INSERT INTO public.movies (title, description, genre, duration, rating, poster, language, release_date, trailer_url) VALUES
('Fantastic Four', 'Marvel''s first family faces their greatest cosmic threat yet as they defend Earth from a world-devouring force.', 'Action, Sci-Fi, Adventure', 124, 8.1, 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', 'English', '2026-07-01', 'https://www.youtube.com/watch?v=pAsmrKyMqaA'),
('Superman', 'The Man of Steel returns to remind a divided world what hope looks like, balancing his Kryptonian heritage with his human heart.', 'Action, Adventure, Sci-Fi', 129, 8.2, 'https://image.tmdb.org/t/p/w500/ombsmhYUqR4qqOLOxAyr5V8hbyv.jpg', 'English', '2026-07-11', 'https://www.youtube.com/watch?v=uhUht6vAsMY'),
('F1', 'A veteran driver comes out of retirement to mentor a rookie phenom, chasing one last shot at glory on the world''s fastest circuits.', 'Drama, Sport', 155, 8.3, 'https://image.tmdb.org/t/p/w500/9PXZIUsSDh4alB80jheWX4fhZmy.jpg', 'English', '2026-06-27', 'https://www.youtube.com/watch?v=8yh9BPUBbbQ'),
('Materialists', 'A sharp New York matchmaker is caught between a perfect suitor and an imperfect ex, discovering love rarely obeys the spreadsheet.', 'Comedy, Romance', 116, 7.2, 'https://image.tmdb.org/t/p/w500/eDo0pNruy0Qgj6BdTyUhTNQEQ2C.jpg', 'English', '2026-06-13', 'https://www.youtube.com/watch?v=iP3PhP1PVDI');

INSERT INTO public.theatres (name, location, amenity) VALUES
('PVR Cinemas', 'Lulu Mall · Edappally', 'Premium'),
('Cinepolis', 'Centre Square Mall', 'Premium'),
('Vanitha Vineetha', 'MG Road · Kochi', 'Parking');

INSERT INTO public.shows (movie_id, theatre_id, show_date, show_time)
SELECT m.id, t.id, (CURRENT_DATE + d)::date, tm.t
FROM public.movies m
CROSS JOIN generate_series(0, 4) AS d
JOIN public.theatres t ON true
JOIN LATERAL (
  SELECT unnest(
    CASE t.name
      WHEN 'PVR Cinemas' THEN ARRAY['10:30','13:45','16:50','20:15']::time[]
      WHEN 'Cinepolis' THEN ARRAY['11:15','14:30','18:00','21:30']::time[]
      ELSE ARRAY['12:00','15:15','19:00']::time[]
    END
  ) AS t
) tm ON true;
