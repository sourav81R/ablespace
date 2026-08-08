/**
 * Loaded before every test file.
 *
 * `class-validator` and `class-transformer` decorators need the metadata
 * reflection polyfill at import time. In the running app `main.ts` imports it;
 * tests import DTOs directly, so they need it here.
 */
import 'reflect-metadata';
