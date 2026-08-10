/**
 * PM2 process file for Hostinger VPS — NO Docker.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup
 */
module.exports = {
  apps: [
    {
      name: "ic-api",
      cwd: __dirname,
      script: "npm",
      args: "run start:prod -w @instacertify/api",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
      max_memory_restart: "512M",
      time: true,
    },
    {
      name: "ic-web",
      cwd: __dirname,
      script: "npm",
      args: "run start -w @instacertify/web",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "512M",
      time: true,
    },
  ],
};
