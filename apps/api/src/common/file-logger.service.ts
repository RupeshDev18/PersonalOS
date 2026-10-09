import { Injectable, LoggerService } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FileLoggerService implements LoggerService {
  private logDir: string;
  private appLogFile: string;
  private errorLogFile: string;

  constructor() {
    this.logDir = path.resolve(process.cwd(), 'logs');
    if (!fs.existsSync(this.logDir)) {
      try {
        fs.mkdirSync(this.logDir, { recursive: true });
      } catch (err) {
        // directory creation fallback
      }
    }
    this.appLogFile = path.join(this.logDir, 'personal-os.log');
    this.errorLogFile = path.join(this.logDir, 'error.log');
  }

  private write(file: string, level: string, message: any, context?: string, extra?: unknown) {
    const timestamp = new Date().toISOString();
    const ctx = context ? `[${context}]` : '';
    let extraStr = '';
    if (extra !== undefined) {
      try {
        extraStr = typeof extra === 'string' ? ` | ${extra}` : ` | ${JSON.stringify(extra)}`;
      } catch {
        extraStr = ' | [Circular Data]';
      }
    }
    const line = `[${timestamp}] [${level}] ${ctx} ${message}${extraStr}\n`;
    try {
      fs.appendFileSync(file, line, 'utf8');
    } catch {
      // file append fallback
    }
  }

  log(message: any, context?: string, extra?: unknown) {
    this.write(this.appLogFile, 'INFO', message, context, extra);
  }

  error(message: any, trace?: string, context?: string) {
    this.write(this.appLogFile, 'ERROR', message, context, trace);
    this.write(this.errorLogFile, 'ERROR', message, context, trace);
  }

  warn(message: any, context?: string) {
    this.write(this.appLogFile, 'WARN', message, context);
  }

  debug(message: any, context?: string) {
    this.write(this.appLogFile, 'DEBUG', message, context);
  }

  verbose(message: any, context?: string) {
    this.write(this.appLogFile, 'VERBOSE', message, context);
  }

  getLogPath(): string {
    return this.appLogFile;
  }
}

// Global singleton instance for seamless import across connectors, tools & agents
export const fileLogger = new FileLoggerService();
