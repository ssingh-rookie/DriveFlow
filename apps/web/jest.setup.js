import '@testing-library/jest-dom';
import 'whatwg-fetch';

jest.mock('@driveflow/clients', () => ({
  makeClient: () => ({
    GET: jest.fn(),
  }),
}));
