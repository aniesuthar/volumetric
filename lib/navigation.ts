// Simple navigation helper that avoids React 19 hook conflicts
export function navigateTo(path: string) {
  // Use History API for client-side navigation without full page reload
  if (typeof window !== 'undefined') {
    window.history.pushState({}, '', path)
    // Trigger a popstate event to notify Next.js router
    window.dispatchEvent(new PopStateEvent('popstate'))
  }
}

export function navigateAndReload(path: string) {
  // For critical navigation that needs a clean page load
  if (typeof window !== 'undefined') {
    window.location.href = path
  }
}