import { NextResponse } from 'next/server';

export async function middleware(req) {
  const url = req.nextUrl.clone();
  const { pathname } = req.nextUrl;

  // Protéger les routes commençant par /espace/admin
  if (pathname.startsWith('/espace/admin')) {
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
        if (data.user && data.user.role === 'admin') {
          // Utilisateur connecté et admin
          return NextResponse.next();
        }
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
