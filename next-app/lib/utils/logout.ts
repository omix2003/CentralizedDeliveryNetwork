/**
 * Simple logout utility
 */
export async function performLogout(signOut: (options?: { redirect?: boolean; callbackUrl?: string }) => Promise<void>, router: any) {
  try {
    await signOut({ 
      redirect: true,
      callbackUrl: '/login'
    });
  } catch (error) {
    console.error('Error during logout:', error);
    router.push('/login');
  }
}
