import { NextResponse } from 'next/server';

export function middleware(req) {
  const url = req.nextUrl.clone();
  const { pathname } = req.nextUrl;

  // Protéger les routes commençant par /espace/admin
  if (pathname.startsWith('/espace/admin')) {
    const sessionToken = req.cookies.get('session_token')?.value;
    const userRole = req.cookies.get('user_role')?.value;

    // Si pas de session ou pas admin, rediriger vers la page de connexion
    if (!sessionToken || userRole !== 'admin') {
      url.pathname = '/se-connecter';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/espace/admin/:path*'],
};

