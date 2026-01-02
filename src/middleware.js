import { NextResponse } from 'next/server';

// Helper to parse a cookie value from a raw Cookie header
function parseCookieHeaderForToken(cookieHeader, name = 'session_token') {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';').map(p => p.trim());
  for (const p of parts) {
    if (p.startsWith(name + '=')) return p.substring(name.length + 1);
  }
  return null;
}

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const { pathname } = req.nextUrl;

  // Protéger les routes commençant par /espace/admin
  if (pathname.startsWith('/espace/admin')) {
    try {
      // Try to validate session directly using DB connection if available (Node runtime).
      // In Edge runtime this dynamic import will fail and we'll fallback to the previous fetch approach.
      let user = null;

      const cookieHeader = req.headers.get('cookie') || '';
      let sessionToken = req.cookies.get('session_token')?.value || null;
      if (!sessionToken && cookieHeader) sessionToken = parseCookieHeaderForToken(cookieHeader, 'session_token');

      if (sessionToken) {
        try {
          // dynamic import of DB pool (works only in Node runtime)
          const { default: pool } = await import('@/lib/db');

          // Query sessions
          const [sessions] = await pool.query(
            'SELECT user_id, expires FROM sessions WHERE session_token = ?',
            [sessionToken]
          );

          if (sessions.length > 0) {
            const session = sessions[0];
            if (new Date(session.expires) >= new Date()) {
              // load user
              const [users] = await pool.query(
                'SELECT id, role, email, nom, prenom FROM users WHERE id = ?',
                [session.user_id]
              );

              if (users.length > 0) {
                user = users[0];
              }
            } else {
              // session expired - remove it
              try { await pool.query('DELETE FROM sessions WHERE session_token = ?', [sessionToken]); } catch (e) { /* ignore */ }
            }
          }
        } catch (errDb) {
          // DB not available in this runtime (likely Edge) -> fallback to fetch
          console.debug('[middleware] DB import failed or DB error, will fallback to internal /api/auth/me', errDb?.message || errDb);
        }
      }

      // If user wasn't resolved via DB, fallback to internal API (/api/auth/me)
      if (!user) {
        try {
          const origin = req.nextUrl.origin;
          // Valider la session via l'API interne /api/auth/me
          const meRes = await fetch(`${origin}/api/auth/me`, {
            method: 'GET',
            headers: {
              // Forward les cookies du client pour que /api/auth/me puisse lire session_token
              cookie: req.headers.get('cookie') || ''
            },
          });

          if (meRes.ok) {
            const data = await meRes.json();
            if (data.user) user = data.user;
          }
        } catch (errFetch) {
          console.error('[middleware] Erreur lors de la vérification de session via /api/auth/me:', errFetch);
        }
      }

      if (user && user.role === 'admin') {
        // inject user info into the request headers so downstream handlers can access it
        const requestHeaders = new Headers(req.headers);
        if (user.id) requestHeaders.set('x-user-id', String(user.id));
        if (user.role) requestHeaders.set('x-user-role', String(user.role));
        if (user.email) requestHeaders.set('x-user-email', String(user.email));

        return NextResponse.next({ request: { headers: requestHeaders } });
      }

    } catch (err) {
      // si erreur, on continue vers la validation UID / redirection
      console.error('[middleware] Erreur lors de la vérification de session:', err);
    }

    // Sinon, tenter la validation via le paramètre ?uid=
    const uid = req.nextUrl.searchParams.get('uid');
    if (uid) {
      try {
        const origin = req.nextUrl.origin;
        const res = await fetch(
          `${origin}/api/admin/validate-uid?uid=${encodeURIComponent(uid)}`,
          {
            method: 'GET',
            headers: {
              // on peut forward les cookies si besoin
              cookie: req.headers.get('cookie') || ''
            }
          }
        );

        // Considérer les codes 2xx et 3xx comme succès (l'API peut renvoyer une redirection vers le dashboard)
        if (res.status >= 200 && res.status < 400) {
          // Forwarder la réponse permet de propager les cookies et la redirection vers le client.
          return res;
        }

        // UID invalide -> réécrire vers une page d'UID invalide qui affiche le message + décompte
        const dest = req.nextUrl.clone();
        dest.pathname = '/espace/admin/uid-invalide';
        return NextResponse.rewrite(dest);
      } catch (err) {
        // En cas d'erreur lors de la validation, rediriger vers la page de connexion
        url.pathname = '/se-connecter';
        return NextResponse.redirect(url);
      }
    }

    // Pas de session admin et pas d'uid -> rediriger vers la page de connexion
    url.pathname = '/se-connecter';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/espace/admin/:path*'],
};
