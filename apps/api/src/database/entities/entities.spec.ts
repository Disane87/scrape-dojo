import { Run } from './run.entity';
import { RunStep } from './run-step.entity';
import { RunAction } from './run-action.entity';
import { RunLog } from './run-log.entity';
import { ScrapeData } from './scrape-data.entity';
import { ScrapeSchedule } from './scrape-schedule.entity';
import { SecretEntity } from './secret.entity';
import { VariableEntity } from './variable.entity';

describe('Database Entities', () => {
  describe('Run', () => {
    it('should be instantiable', () => {
      const run = new Run();
      run.id = 'run-1';
      run.scrapeId = 'scrape-1';
      run.status = 'running';
      run.trigger = 'manual';
      expect(run.id).toBe('run-1');
      expect(run.status).toBe('running');
    });
  });

  describe('RunStep', () => {
    it('should be instantiable', () => {
      const step = new RunStep();
      step.stepName = 'Login';
      step.status = 'running';
      step.stepOrder = 0;
      expect(step.stepName).toBe('Login');
    });
  });

  describe('RunAction', () => {
    it('should be instantiable', () => {
      const action = new RunAction();
      action.actionName = 'Navigate';
      action.actionType = 'navigate';
      action.status = 'running';
      expect(action.actionName).toBe('Navigate');
    });
  });

  describe('RunLog', () => {
    it('should be instantiable', () => {
      const log = new RunLog();
      log.runId = 'run-1';
      log.level = 'log';
      log.message = 'Test message';
      log.context = 'TestContext';
      expect(log.message).toBe('Test message');
    });
  });

  describe('ScrapeData', () => {
    it('should be instantiable', () => {
      const data = new ScrapeData();
      data.scrapeId = 'scrape-1';
      data.key = 'myKey';
      data.value = 'myValue';
      expect(data.key).toBe('myKey');
    });
  });

  describe('ScrapeSchedule', () => {
    it('should be instantiable', () => {
      const schedule = new ScrapeSchedule();
      schedule.scrapeId = 'scrape-1';
      schedule.scheduleEnabled = true;
      schedule.cronExpression = '0 * * * *';
      expect(schedule.cronExpression).toBe('0 * * * *');
    });
  });

  describe('SecretEntity', () => {
    it('should be instantiable', () => {
      const secret = new SecretEntity();
      secret.id = 'sec-1';
      secret.name = 'test-secret';
      secret.encryptedValue = 'encrypted';
      expect(secret.name).toBe('test-secret');
    });
  });

  describe('VariableEntity', () => {
    it('should be instantiable', () => {
      const variable = new VariableEntity();
      variable.id = 'var-1';
      variable.name = 'test-var';
      variable.value = 'test-value';
      variable.scope = 'global';
      variable.isSecret = false;
      expect(variable.name).toBe('test-var');
      expect(variable.scope).toBe('global');
    });
  });
});
