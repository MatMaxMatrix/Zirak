/**
 * Custom API route to handle Auth0 authentication errors
 * This is particularly useful for handling cases where Auth0 denies access
 * due to unverified emails
 */
export default function handler(req, res) {
  // Get error information from the request
  const { error, error_description, state } = req.query;
  
  console.log('Auth0 error:', { error, error_description, state });
  
  // Check if this is an access_denied error and likely due to unverified email
  if (error === 'access_denied') {
    // Redirect to the email verification page
    return res.redirect(307, '/verify-email');
  }
  
  // For other errors, redirect to a general error page or home
  return res.redirect(307, '/?auth_error=' + encodeURIComponent(error_description || 'Unknown authentication error'));
} 