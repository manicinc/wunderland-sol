#!/bin/bash

# SSH to Linode and check app status
echo "=== CHECKING APP STATUS ==="

# Check PM2 status
echo "PM2 Status:"
pm2 status

# Check backend logs
echo -e "\nBackend Logs (last 20 lines):"
pm2 logs voice-backend --lines 20 --nostream

# Check if backend is responding
echo -e "\nBackend Health Check:"
curl -s http://localhost:3333/health || echo "Backend not responding!"

# Check Nginx status
echo -e "\nNginx Status:"
sudo systemctl status nginx --no-pager

# Check what's listening on ports
echo -e "\nPorts in use:"
sudo netstat -tlnp | grep -E ":(80|443|3333)"

echo "=== QUICK FIX COMMANDS ==="
echo "Restart backend:    pm2 restart voice-backend"
echo "View logs:          pm2 logs voice-backend"
echo "Restart Nginx:      sudo systemctl restart nginx"
echo "Check Nginx logs:   sudo tail -f /var/log/nginx/error.log"
echo "Rebuild backend:    cd ~/voice-chat-assistant && pnpm install && pnpm --filter ./backend run build && pm2 restart voice-backend"
