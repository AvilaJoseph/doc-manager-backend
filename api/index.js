// Punto de entrada de la Vercel Function: delega en la app Nest ya compilada por `npm run build`
module.exports = require('../dist/serverless').default;
