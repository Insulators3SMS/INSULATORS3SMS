module.exports = function requireApprentice(req, res, next) {
  console.log('🔐 requireApprentice middleware triggered');
  console.log('Session user:', req.session.user);

  if (!req.session.user || !req.session.user.reg) {
    console.warn('Redirecting to login — missing session or reg');
    return res.redirect('/login.html');
  }

  next();
};