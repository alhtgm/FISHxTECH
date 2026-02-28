import { App } from './ui/App';

const app = new App('app');
(window as unknown as Record<string, unknown>).__app = app;
