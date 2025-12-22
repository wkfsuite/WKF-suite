// monitor.js
// Sistema di monitoraggio errori e performance del server

class ServerMonitor {
  constructor() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.errors = [];
    this.maxErrorsToStore = 100;
  }

  /**
   * Middleware per loggare tutte le richieste
   */
  logRequest(req, res, next) {
    this.requestCount++;

    const startTime = Date.now();

    // Intercetta gli errori
    const originalEnd = res.end;
    res.end = (...args) => {
      const duration = Date.now() - startTime;

      // Log solo errori 4xx e 5xx
      if (res.statusCode >= 400) {
        this.errorCount++;

        const errorLog = {
          timestamp: new Date().toISOString(),
          method: req.method,
          url: req.url,
          statusCode: res.statusCode,
          duration: duration,
          ip: req.ip || req.connection.remoteAddress
        };

        this.errors.unshift(errorLog);

        // Mantieni solo gli ultimi N errori
        if (this.errors.length > this.maxErrorsToStore) {
          this.errors.pop();
        }

        console.error(`L Error ${res.statusCode}: ${req.method} ${req.url} (${duration}ms)`);
      }

      // Chiama la funzione originale
      originalEnd.apply(res, args);
    };

    next();
  }

  /**
   * Ottieni statistiche correnti
   */
  getStats() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const errorRate = this.requestCount > 0
      ? ((this.errorCount / this.requestCount) * 100).toFixed(2)
      : 0;

    return {
      uptime: uptime,
      requests: this.requestCount,
      errors: this.errorCount,
      errorRate: parseFloat(errorRate),
      memory: {
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss
      },
      pid: process.pid,
      recentErrors: this.errors.slice(0, 10)
    };
  }

  /**
   * Reset statistiche
   */
  reset() {
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.errors = [];
    console.log('=Ê Monitor statistiche resettate');
  }

  /**
   * Ottieni solo gli errori recenti
   */
  getRecentErrors(limit = 50) {
    return this.errors.slice(0, limit);
  }

  /**
   * Ottieni report errori raggruppati per endpoint
   */
  getErrorReport() {
    const errorsByEndpoint = {};

    for (const error of this.errors) {
      const key = `${error.method} ${error.url}`;
      if (!errorsByEndpoint[key]) {
        errorsByEndpoint[key] = {
          count: 0,
          statusCodes: {},
          avgDuration: 0,
          totalDuration: 0
        };
      }

      errorsByEndpoint[key].count++;
      errorsByEndpoint[key].statusCodes[error.statusCode] =
        (errorsByEndpoint[key].statusCodes[error.statusCode] || 0) + 1;
      errorsByEndpoint[key].totalDuration += error.duration;
      errorsByEndpoint[key].avgDuration =
        errorsByEndpoint[key].totalDuration / errorsByEndpoint[key].count;
    }

    return errorsByEndpoint;
  }
}

module.exports = ServerMonitor;
