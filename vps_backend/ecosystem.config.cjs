module.exports = {
  apps: [
    {
      name: "minutka-api",
      script: "dist/server.js",
      cwd: "./",
      instances: "max",
      exec_mode: "cluster",
      autorestart: true,
      max_memory_restart: "450M",
      listen_timeout: 10000,
      kill_timeout: 5000,
      min_uptime: "10s",
      max_restarts: 20,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      out_file: "./logs/api.out.log",
      error_file: "./logs/api.err.log",
      env: {
        NODE_ENV: "production",
        PORT: 8080
      }
    },
    {
      name: "minutka-outbox-worker",
      script: "dist/queue/outbox.worker.js",
      cwd: "./",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "350M",
      min_uptime: "10s",
      max_restarts: 20,
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      out_file: "./logs/worker.out.log",
      error_file: "./logs/worker.err.log",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
