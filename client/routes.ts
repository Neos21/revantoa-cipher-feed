import { type RouteConfig, index, route } from '@react-router/dev/routes';

/** ルート定義 */
export default [
  index('./pages/index/index.tsx'),
  
  route('/signup', './pages/signup/signup.tsx'),
  route('/login' , './pages/login/login.tsx'),
  
  route('/settings', './pages/settings/settings.tsx')
] satisfies RouteConfig;
