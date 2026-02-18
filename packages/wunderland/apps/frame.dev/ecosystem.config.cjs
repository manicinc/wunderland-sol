/**
 * PM2 Ecosystem Configuration for Quarry.space Production Deployment
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 *
 * Commands:
 *   pm2 status                    - Check all processes
 *   pm2 logs                      - View all logs
 *   pm2 logs quarry-app           - View app logs
 *   pm2 logs quarry-api           - View API logs
 *   pm2 restart all               - Restart all processes
 *   pm2 reload all                - Zero-downtime reload
 *   pm2 monit                     - Real-time monitoring
 */

module.exports = {
  apps: [
    {
      name: 'quarry-app',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      cwd: '/opt/quarry/apps/frame.dev',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/quarry-app-error.log',
      out_file: '/var/log/pm2/quarry-app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'quarry-api',
      script: 'dist/server.js',
      cwd: '/opt/quarry/apps/frame.dev',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        API_PORT: 3847,
        API_HOST: '0.0.0.0'
      },
      error_file: '/var/log/pm2/quarry-api-error.log',
      out_file: '/var/log/pm2/quarry-api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
