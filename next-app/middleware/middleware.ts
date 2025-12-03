import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';
import {auth} from '@/auth';

type UserRole ='AGENT' | 'PARTNER' |'ADMIN';

const protectedRoutes: Record<string, UserRole[]>={
    '/agent':['AGENT'],
    '/partner':['PARTNER'],
    '/admin':['ADMIN'],
};

const publicRoutes: string[]=['/login','/register', '/'];

export default async function middleware(request: NextRequest)
{
    const {pathname} = request.nextUrl;
    const isPublicRoute = publicRoutes.some(route =>
        pathname.startsWith('/api/auth')
    );
    if(isPublicRoute)
    {
        return NextResponse.next();
    }
    const session = await auth();
    const routeKey = Object.keys(protectedRoutes).find(key =>
        pathname.startsWith(key)
    );

    if(routeKey){
        if(!session?.user){
            const loginUrl = new URL('/login', request.url);
            loginUrl.searchParams.set('callbackUrl', pathname);
            return NextResponse.redirect(loginUrl);
        }
        
        const requiredRoles = protectedRoutes[routeKey];
        const userRole = session.user.role;
        if(requiredRoles.includes(userRole))
        {
            const redirectUrl= getRoleDashboard(userRole) || '/';
            return NextResponse.redirect(new URL(redirectUrl, request.url));
        }
    }

    return NextResponse.next();
}

function getRoleDashboard(role:UserRole): string |null{
    switch(role){
        case 'AGENT':
            return '/agent';
        case 'PARTNER':
            return '/partner';
        case 'ADMIN':
            return '/admin';
        default:
            return null;
    }
}

export const config ={
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',

    ],
};



